import {Injectable, computed, effect, signal} from '@angular/core';
import {CreateCategoryDTO} from '../dtos/create-category.dto';
import {CreateMovementDTO} from '../dtos/create-movement.dto';
import {SEED_CATEGORIES} from '../constants/seed-categories.constant';
import {SEED_MOVEMENTS} from '../constants/seed-movements.constant';
import {Category} from '../models/category.model';
import {Movement} from '../models/movement.model';
import {MovementType} from '../types/movement-type.type';
import {formatCurrency} from '../utils/format-currency.util';
import {FinanceStorage} from './finance-storage.interface';

const STORAGE_KEY_CATEGORIES = 'peco.categories';
const STORAGE_KEY_MOVEMENTS = 'peco.movements';

@Injectable({providedIn: 'root'})
export class LocalFinanceService implements FinanceStorage {
  private readonly categoriesSignal = signal<Category[]>([]);
  private readonly movementsSignal = signal<Movement[]>([]);

  readonly categories = this.categoriesSignal.asReadonly();
  readonly movements = this.movementsSignal.asReadonly();

  readonly totalBalance = computed(() =>
    this.categories().reduce((total, category) => total + category.currentBalance, 0),
  );

  constructor() {
    this.categoriesSignal.set(this.readPersisted(STORAGE_KEY_CATEGORIES, SEED_CATEGORIES));
    this.movementsSignal.set(this.readPersisted(STORAGE_KEY_MOVEMENTS, SEED_MOVEMENTS));

    effect(() => {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(this.categories()));
      localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(this.movements()));
    });
  }

  addCategory(dto: CreateCategoryDTO): void {
    const category: Category = {
      id: crypto.randomUUID(),
      name: dto.name.trim(),
      currentBalance: dto.initialBalance,
      targetGoal: dto.targetGoal,
      color: dto.color,
      icon: dto.icon,
    };
    this.categoriesSignal.update((current) => [...current, category]);
  }

  updateCategory(id: string, dto: CreateCategoryDTO): void {
    this.categoriesSignal.update((current) =>
      current.map((category) =>
        category.id === id
          ? {
              ...category,
              name: dto.name.trim(),
              targetGoal: dto.targetGoal,
              color: dto.color,
              icon: dto.icon ?? category.icon,
            }
          : category,
      ),
    );
  }

  deleteCategory(id: string, destinationCategoryId?: string): void {
    const category = this.categories().find((c) => c.id === id);
    if (!category) return;

    if (category.currentBalance !== 0 && destinationCategoryId && destinationCategoryId !== id) {
      const amount = category.currentBalance;
      this.registerMovement({
        categoryId: id,
        type: 'TRANSFER',
        amount,
        destinationCategoryId,
        note: `Eliminación de cuenta ${category.name} traspaso ${formatCurrency(amount)}`,
      });
    }

    this.categoriesSignal.update((current) => current.filter((c) => c.id !== id));
  }

  registerMovement(dto: CreateMovementDTO): void {
    const movement: Movement = {
      id: crypto.randomUUID(),
      date: dto.date ?? new Date().toISOString(),
      categoryId: dto.categoryId,
      type: dto.type,
      amount: dto.amount,
      note: dto.note,
      destinationCategoryId: dto.destinationCategoryId,
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
      categoryId:
        movement.type === 'TRANSFER'
          ? (movement.destinationCategoryId ?? movement.categoryId)
          : movement.categoryId,
      type: this.reversalType(movement.type),
      amount: movement.amount,
      note: this.reversalNote(movement),
      destinationCategoryId:
        movement.type === 'TRANSFER' ? movement.categoryId : movement.destinationCategoryId,
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
    this.categoriesSignal.update((current) =>
      current.map((category) => {
        let balance = category.currentBalance;

        if (category.id === movement.categoryId) {
          const sourceDelta = movement.type === 'INCOME' ? movement.amount : -movement.amount;
          balance += sourceDelta;
        }

        if (
          movement.type === 'TRANSFER' &&
          movement.destinationCategoryId &&
          category.id === movement.destinationCategoryId
        ) {
          balance += movement.amount;
        }

        return balance === category.currentBalance
          ? category
          : {...category, currentBalance: balance};
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
    }
  }

  private readPersisted<T>(key: string, fallback: T[]): T[] {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const data = JSON.parse(raw) as unknown;
      return Array.isArray(data) ? (data as T[]) : fallback;
    } catch {
      return fallback;
    }
  }
}
