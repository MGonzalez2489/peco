import {Injectable, computed, effect, signal} from '@angular/core';
import {CreateAccountDto} from '../dtos/create-account.dto';
import {CreateMovementDTO} from '../dtos/create-movement.dto';
import {SEED_ACCOUNTS} from '../constants/seed-accounts.constant';
import {SEED_MOVEMENTS} from '../constants/seed-movements.constant';
import {Account} from '../models/account.model';
import {Movement} from '../models/movement.model';
import {MovementType} from '../types/movement-type.type';
import {formatCurrency} from '../utils/format-currency.util';
import {FinanceStorage} from './finance-storage.interface';

const STORAGE_KEY_ACCOUNTS = 'peco.accounts';
const STORAGE_KEY_CUENTAS_DEPRECATED = 'peco.cuentas';
const STORAGE_KEY_CATEGORIES_DEPRECATED = 'peco.categories';
const STORAGE_KEY_MOVEMENTS = 'peco.movements';

@Injectable({providedIn: 'root'})
export class LocalFinanceService implements FinanceStorage {
  private readonly accountsSignal = signal<Account[]>([]);
  private readonly movementsSignal = signal<Movement[]>([]);

  readonly accounts = this.accountsSignal.asReadonly();
  readonly movements = this.movementsSignal.asReadonly();

  readonly totalBalance = computed(() =>
    this.accounts().reduce((total, account) => total + account.currentBalance, 0),
  );

  constructor() {
    this.accountsSignal.set(this.ensureRoot(this.readAccounts()));
    this.movementsSignal.set(this.readPersisted(STORAGE_KEY_MOVEMENTS, null) ?? SEED_MOVEMENTS);

    effect(() => {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(this.accounts()));
      localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(this.movements()));
    });
  }

  addAccount(dto: CreateAccountDto): void {
    const needsRoot = !this.accounts().some((account) => account.isRoot);
    const account: Account = {
      id: crypto.randomUUID(),
      name: dto.name.trim(),
      currentBalance: dto.initialBalance,
      targetGoal: dto.targetGoal,
      color: dto.color,
      icon: dto.icon,
      pinToHome: dto.pinToHome ?? false,
      isRoot: needsRoot ? true : undefined,
    };
    this.accountsSignal.update((current) => [...current, account]);
  }

  updateAccount(id: string, dto: CreateAccountDto): void {
    this.accountsSignal.update((current) =>
      current.map((account) =>
        account.id === id
          ? {
              ...account,
              name: dto.name.trim(),
              targetGoal: dto.targetGoal,
              color: dto.color,
              icon: dto.icon ?? account.icon,
              pinToHome: dto.pinToHome ?? false,
              isRoot: account.isRoot,
            }
          : account,
      ),
    );
  }

  deleteAccount(id: string, targetAccountId?: string): void {
    const account = this.accounts().find((a) => a.id === id);
    if (!account || account.isRoot) return;

    if (account.currentBalance !== 0 && targetAccountId && targetAccountId !== id) {
      const amount = account.currentBalance;
      this.registerMovement({
        accountId: id,
        type: 'TRANSFER',
        amount,
        targetAccountId,
        note: `Eliminación de cuenta ${account.name} traspaso ${formatCurrency(amount)}`,
      });
    }

    this.accountsSignal.update((current) => current.filter((a) => a.id !== id));
  }

  registerMovement(dto: CreateMovementDTO): void {
    const movement: Movement = {
      id: crypto.randomUUID(),
      date: dto.date ?? new Date().toISOString(),
      accountId: dto.accountId,
      type: dto.type,
      amount: dto.amount,
      note: dto.note,
      targetAccountId: dto.targetAccountId,
    };

    this.movementsSignal.update((current) => [movement, ...current]);
    this.applyMovement(movement);
  }

  revertMovement(id: string): void {
    const movement = this.movements().find((m) => m.id === id);
    if (!movement || movement.isReversal) return;

    const reversal: Movement = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      accountId:
        movement.type === 'TRANSFER'
          ? (movement.targetAccountId ?? movement.accountId)
          : movement.accountId,
      type: this.reversalType(movement.type),
      amount: movement.amount,
      note: this.reversalNote(movement),
      targetAccountId: movement.type === 'TRANSFER' ? movement.accountId : movement.targetAccountId,
      reversalId: movement.id,
      isReversal: true,
    };

    this.movementsSignal.update((current) =>
      current.map((m) => (m.id === movement.id ? {...m, isReversal: true} : m)),
    );
    this.movementsSignal.update((current) => [reversal, ...current]);
    this.applyMovement(reversal);
  }

  private applyMovement(movement: Movement): void {
    this.accountsSignal.update((current) =>
      current.map((account) => {
        let balance = account.currentBalance;

        if (account.id === movement.accountId) {
          const sourceDelta = movement.type === 'INCOME' ? movement.amount : -movement.amount;
          balance += sourceDelta;
        }

        if (
          movement.type === 'TRANSFER' &&
          movement.targetAccountId &&
          account.id === movement.targetAccountId
        ) {
          balance += movement.amount;
        }

        return balance === account.currentBalance ? account : {...account, currentBalance: balance};
      }),
    );
  }

  private reversalType(type: MovementType): MovementType {
    switch (type) {
      case 'INCOME':
        return 'EXPENSE';
      case 'EXPENSE':
        return 'INCOME';
      case 'TRANSFER':
        return 'TRANSFER';
      default:
        return 'EXPENSE';
    }
  }

  private reversalNote(movement: Movement): string {
    switch (movement.type) {
      case 'INCOME':
        return `Reversión de ingreso ${movement.id}`;
      case 'EXPENSE':
        return `Reversión de egreso ${movement.id}`;
      case 'TRANSFER':
        return `Reversión de transferencia ${movement.id}`;
      default:
        return '';
    }
  }

  private readAccounts(): Account[] {
    const current = this.readPersisted<Account>(STORAGE_KEY_ACCOUNTS, null);
    if (current) return current;
    const legacyStore = this.readPersisted<Account>(STORAGE_KEY_CUENTAS_DEPRECATED, null);
    if (legacyStore) return legacyStore;
    return this.readPersisted<Account>(STORAGE_KEY_CATEGORIES_DEPRECATED, null) ?? SEED_ACCOUNTS;
  }

  private readPersisted<T>(key: string, fallback: T[] | null): T[] | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const data = JSON.parse(raw) as unknown;
      return Array.isArray(data) ? (data as T[]) : fallback;
    } catch {
      return fallback;
    }
  }

  private ensureRoot(accounts: Account[]): Account[] {
    if (accounts.some((account) => account.isRoot)) return accounts;
    if (accounts.length === 0) return accounts;
    const [first, ...rest] = accounts;
    return [{...first, isRoot: true}, ...rest];
  }
}
