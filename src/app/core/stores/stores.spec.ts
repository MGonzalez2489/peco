import {TestBed} from '@angular/core/testing';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {Account} from '../models/account.model';
import {AccountsStore} from './accounts.store';
import {CatalogStore} from './catalog.store';
import {MovementsStore} from './movements.store';
import {UserPreferencesStore} from './user-preferences.store';

describe('Finance stores', () => {
  let accountsStore: InstanceType<typeof AccountsStore>;
  let movementsStore: InstanceType<typeof MovementsStore>;
  let userPreferencesStore: InstanceType<typeof UserPreferencesStore>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({providers: [AccountsStore, CatalogStore, MovementsStore]});

    accountsStore = TestBed.inject(AccountsStore);
    movementsStore = TestBed.inject(MovementsStore);
    userPreferencesStore = TestBed.inject(UserPreferencesStore);
  });

  it('initializes with only the root account at zero balance', () => {
    const accounts = accountsStore.accounts();
    expect(accounts.length).toBe(1);
    expect(accounts[0].isRoot).toBe(true);
    expect(accounts[0].currentBalance).toBe(0);
    expect(accountsStore.rootAccount()).toBeDefined();
  });

  it('initializes movements empty', () => {
    expect(movementsStore.movements()).toEqual([]);
  });

  it('marks the first created account as root and rejects its deletion', () => {
    const rootId = accountsStore.rootAccount()?.id ?? '';
    expect(accountsStore.deleteAccount(rootId)).toBe(false);
    expect(accountsStore.accounts().some((account) => account.id === rootId)).toBe(true);
  });

  it('persists the semantic account type on creation', () => {
    const account = accountsStore.createAccount({
      name: 'Tarjeta',
      initialBalance: 0,
      type: 'CREDIT',
    });
    if (!account) throw new Error('account must be created');

    expect(account.type).toBe('CREDIT');
    expect(accountsStore.accounts().find((item) => item.id === account.id)?.type).toBe('CREDIT');
  });

  it('allows a credit account to start with a negative balance (debt)', () => {
    const account = accountsStore.createAccount({
      name: 'Tarjeta',
      initialBalance: -1500,
      type: 'CREDIT',
    });
    if (!account) throw new Error('account must be created');

    expect(account.currentBalance).toBe(-1500);
    expect(account.type).toBe('CREDIT');
  });

  it('increases credit debt on expenses and reduces it on payments', () => {
    const card = accountsStore.createAccount({
      name: 'Tarjeta',
      initialBalance: 0,
      type: 'CREDIT',
    });
    if (!card) throw new Error('account must be created');

    const balance = (): number | undefined =>
      accountsStore.accounts().find((item) => item.id === card.id)?.currentBalance;

    movementsStore.registerMovement({
      accountId: card.id,
      categoryId: 'services',
      type: 'EXPENSE',
      amount: 300,
    });

    // A negative balance represents active debt: an expense grows the debt.
    expect(balance()).toBe(-300);

    movementsStore.registerMovement({
      accountId: card.id,
      categoryId: 'payroll',
      type: 'INCOME',
      amount: 100,
    });

    // A payment reduces the outstanding debt.
    expect(balance()).toBe(-200);
  });

  it('persists the optional note on create and update', () => {
    const account = accountsStore.createAccount({
      name: 'Tarjeta',
      initialBalance: 0,
      type: 'CREDIT',
      note: 'Día de corte: 5',
    });
    if (!account) throw new Error('account must be created');

    const persisted = () =>
      JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.accounts) ?? '[]') as Account[];

    expect(persisted().find((item) => item.id === account.id)?.note).toBe('Día de corte: 5');

    accountsStore.updateAccount(account.id, {note: undefined});
    expect(persisted().find((item) => item.id === account.id)?.note).toBeUndefined();
  });

  it('adds income to the source balance', () => {
    const target = accountsStore.createAccount({
      name: 'Ahorro',
      initialBalance: 0,
      type: 'SAVINGS',
    });
    if (!target) throw new Error('account must be created');

    const before = target.currentBalance;

    movementsStore.registerMovement({
      accountId: target.id,
      categoryId: 'payroll',
      type: 'INCOME',
      amount: 100,
    });

    const after = accountsStore.accounts().find((account) => account.id === target.id);
    expect(after?.currentBalance).toBe(before + 100);
  });

  it('moves balance on transfers in both directions', () => {
    const source = accountsStore.rootAccount();
    const destination = accountsStore.createAccount({
      name: 'Ahorro',
      initialBalance: 200,
      type: 'SAVINGS',
    });
    if (!source || !destination) throw new Error('accounts must exist');

    movementsStore.registerMovement({
      accountId: source.id,
      categoryId: 'transfer',
      type: 'TRANSFER',
      amount: 50,
      targetAccountId: destination.id,
    });

    const updatedSource = accountsStore.accounts().find((account) => account.id === source.id);
    const updatedDestination = accountsStore
      .accounts()
      .find((account) => account.id === destination.id);

    expect(updatedSource?.currentBalance).toBe(source.currentBalance - 50);
    expect(updatedDestination?.currentBalance).toBe(destination.currentBalance + 50);
  });

  it('reverses a movement back into the original balance', () => {
    const target = accountsStore.createAccount({
      name: 'Ahorro',
      initialBalance: 0,
      type: 'SAVINGS',
    });
    if (!target) throw new Error('account must be created');

    const baseline = target.currentBalance;

    const movement = movementsStore.registerMovement({
      accountId: target.id,
      categoryId: 'services',
      type: 'EXPENSE',
      amount: 30,
    });
    if (!movement) throw new Error('registerMovement must not return null');

    expect(movementsStore.revertMovement(movement.id)).toBe(true);

    const restored = accountsStore.accounts().find((account) => account.id === target.id);
    expect(restored?.currentBalance).toBe(baseline);
    expect(movementsStore.revertMovement(movement.id)).toBe(false);
  });

  it('exposes call state through loading, loaded and error signals', () => {
    expect(accountsStore.loading()).toBe(false);
    expect(accountsStore.loaded()).toBe(false);
    expect(accountsStore.error()).toBeNull();

    accountsStore.loadAccounts();

    expect(accountsStore.loading()).toBe(false);
    expect(accountsStore.loaded()).toBe(true);
    expect(accountsStore.error()).toBeNull();
  });

  it('records the error and returns null when account creation throws', () => {
    const randomUUID = crypto.randomUUID;
    crypto.randomUUID = () => {
      throw new Error('crypto unavailable');
    };

    try {
      expect(
        accountsStore.createAccount({
          name: 'Fallback',
          initialBalance: 0,
          type: 'CASH',
        }),
      ).toBeNull();
      expect(accountsStore.error()).toBe('crypto unavailable');
      expect(accountsStore.loaded()).toBe(false);
    } finally {
      crypto.randomUUID = randomUUID;
    }

    accountsStore.resetError();
    expect(accountsStore.error()).toBeNull();
  });

  it('filters movements and derives totals', () => {
    const account = accountsStore.createAccount({
      name: 'Ahorro',
      initialBalance: 0,
      type: 'SAVINGS',
    });
    if (!account) throw new Error('account must be created');

    movementsStore.registerMovement({
      accountId: account.id,
      categoryId: 'payroll',
      type: 'INCOME',
      amount: 100,
    });
    movementsStore.setFilters({type: 'INCOME'});

    expect(movementsStore.filteredMovements().every((m) => m.type === 'INCOME')).toBe(true);
    expect(movementsStore.activeFilterCount()).toBe(1);

    movementsStore.clearFilters();
    expect(movementsStore.activeFilterCount()).toBe(0);
  });

  it('filters movements by note with a case-insensitive contains match', () => {
    const account = accountsStore.createAccount({
      name: 'Ahorro',
      initialBalance: 0,
      type: 'SAVINGS',
    });
    if (!account) throw new Error('account must be created');

    movementsStore.registerMovement({
      accountId: account.id,
      categoryId: 'services',
      type: 'EXPENSE',
      amount: 100,
      note: 'Supermercado Central',
    });
    movementsStore.registerMovement({
      accountId: account.id,
      categoryId: 'services',
      type: 'EXPENSE',
      amount: 200,
      note: 'Pago de RENTA julio',
    });

    movementsStore.setFilters({note: 'super'});
    expect(movementsStore.filteredMovements().map((movement) => movement.note)).toEqual([
      'Supermercado Central',
    ]);

    movementsStore.setFilters({note: 'RENTA'});
    expect(movementsStore.filteredMovements().map((movement) => movement.note)).toEqual([
      'Pago de RENTA julio',
    ]);

    movementsStore.setFilters({note: 'hipoteca'});
    expect(movementsStore.filteredMovements()).toEqual([]);

    movementsStore.clearFilters();
    expect(movementsStore.filteredMovements().length).toBe(2);
  });

  it('filters movements by account type, including transfer destinations', () => {
    const cash = accountsStore.createAccount({
      name: 'Efectivo',
      initialBalance: 0,
      type: 'CASH',
    });
    const card = accountsStore.createAccount({
      name: 'Tarjeta',
      initialBalance: 0,
      type: 'CREDIT',
    });
    if (!cash || !card) throw new Error('accounts must be created');

    movementsStore.registerMovement({
      accountId: cash.id,
      categoryId: 'services',
      type: 'EXPENSE',
      amount: 100,
    });
    movementsStore.registerMovement({
      accountId: card.id,
      categoryId: 'services',
      type: 'EXPENSE',
      amount: 200,
    });
    movementsStore.registerMovement({
      accountId: cash.id,
      categoryId: 'transfer',
      type: 'TRANSFER',
      amount: 300,
      targetAccountId: card.id,
    });

    movementsStore.setFilters({accountType: 'CREDIT'});
    expect(
      movementsStore
        .filteredMovements()
        .map((movement) => movement.amount)
        .sort((a, b) => a - b),
    ).toEqual([200, 300]);

    movementsStore.setFilters({accountType: 'CASH'});
    expect(
      movementsStore
        .filteredMovements()
        .map((movement) => movement.amount)
        .sort((a, b) => a - b),
    ).toEqual([100, 300]);

    movementsStore.setFilters({accountType: 'SAVINGS'});
    expect(movementsStore.filteredMovements()).toEqual([]);

    movementsStore.clearFilters();
    expect(movementsStore.filteredMovements().length).toBe(3);
  });

  it('counts the note and account type filters as active filters', () => {
    movementsStore.setFilters({accountType: 'DEBIT'});
    expect(movementsStore.activeFilterCount()).toBe(1);
    expect(movementsStore.hasActiveFilters()).toBe(true);

    movementsStore.setFilters({note: 'renta'});
    expect(movementsStore.activeFilterCount()).toBe(2);

    movementsStore.setFilters({note: '   '});
    expect(movementsStore.activeFilterCount()).toBe(1);

    movementsStore.clearFilters();
    expect(movementsStore.filters().accountType).toBe('ALL');
    expect(movementsStore.filters().note).toBe('');
    expect(movementsStore.hasActiveFilters()).toBe(false);
  });

  it('groups filtered movements by formatted date', () => {
    const root = accountsStore.rootAccount();
    if (!root) throw new Error('root account must exist');

    movementsStore.registerMovement({
      accountId: root.id,
      categoryId: 'payroll',
      type: 'INCOME',
      amount: 50,
    });

    const groups = movementsStore.groupedMovementsByDate();
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('computes net balance from income minus expenses', () => {
    const {totalIncome, totalExpenses, netBalance} = movementsStore.filteredTotals();
    expect(netBalance).toBe(totalIncome - totalExpenses);
  });

  it('exposes category scopes from the catalog store', () => {
    const catalogStore = TestBed.inject(CatalogStore);

    expect(catalogStore.incomeCategories().length).toBeGreaterThan(0);
    expect(catalogStore.expenseCategories().length).toBeGreaterThan(0);
    expect(catalogStore.transferCategory()?.id).toBe('transfer');
    expect(catalogStore.categoriesForType('TRANSFER')).toEqual([catalogStore.transferCategory()]);
  });

  it('toggles pin without touching the balance', () => {
    const account = accountsStore.createAccount({
      name: 'Ahorro',
      initialBalance: 0,
      type: 'SAVINGS',
    });
    if (!account) throw new Error('account must be created');

    const before = account.currentBalance;
    accountsStore.togglePin(account.id);

    const updated = accountsStore.accounts().find((item) => item.id === account.id);
    expect(updated?.pinToHome).toBe(!account.pinToHome);
    expect(updated?.currentBalance).toBe(before);
  });

  it('hides reverted movements and their contra-movements when the preference is enabled', () => {
    const account = accountsStore.createAccount({
      name: 'Ahorro',
      initialBalance: 0,
      type: 'SAVINGS',
    });
    if (!account) throw new Error('account must be created');

    const movement = movementsStore.registerMovement({
      accountId: account.id,
      categoryId: 'services',
      type: 'EXPENSE',
      amount: 30,
    });
    if (!movement) throw new Error('registerMovement must not return null');

    expect(userPreferencesStore.hideReversal()).toBe(true);
    expect(movementsStore.revertMovement(movement.id)).toBe(true);
    expect(movementsStore.movements().length).toBe(2);

    expect(movementsStore.filteredMovements().length).toBe(0);
    expect(movementsStore.movementsForAccount(account.id).length).toBe(0);
    expect(movementsStore.recentMovements(5).length).toBe(0);
  });

  it('shows every movement when the reversal preference is disabled', () => {
    const account = accountsStore.createAccount({
      name: 'Ahorro',
      initialBalance: 0,
      type: 'SAVINGS',
    });
    if (!account) throw new Error('account must be created');

    const movement = movementsStore.registerMovement({
      accountId: account.id,
      categoryId: 'services',
      type: 'EXPENSE',
      amount: 30,
    });
    if (!movement) throw new Error('registerMovement must not return null');

    userPreferencesStore.updateMovementPreferences({hideReversal: false});

    expect(movementsStore.revertMovement(movement.id)).toBe(true);

    expect(movementsStore.filteredMovements().length).toBe(2);
    expect(movementsStore.movementsForAccount(account.id).length).toBe(2);
    expect(movementsStore.recentMovements(5).length).toBe(2);
  });

  it('keeps hiding the reversal pair when the preference is turned back on', () => {
    const account = accountsStore.createAccount({
      name: 'Ahorro',
      initialBalance: 0,
      type: 'SAVINGS',
    });
    if (!account) throw new Error('account must be created');

    const movement = movementsStore.registerMovement({
      accountId: account.id,
      categoryId: 'services',
      type: 'EXPENSE',
      amount: 30,
    });
    if (!movement) throw new Error('registerMovement must not return null');

    movementsStore.revertMovement(movement.id);

    userPreferencesStore.updateMovementPreferences({hideReversal: false});
    expect(movementsStore.filteredMovements().length).toBe(2);

    userPreferencesStore.updateMovementPreferences({hideReversal: true});
    expect(movementsStore.filteredMovements().length).toBe(0);
  });
});
