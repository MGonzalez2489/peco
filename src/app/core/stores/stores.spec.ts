import {TestBed} from '@angular/core/testing';
import {AccountsStore} from './accounts.store';
import {CatalogStore} from './catalog.store';
import {MovementsStore} from './movements.store';

describe('Finance stores', () => {
  let accountsStore: InstanceType<typeof AccountsStore>;
  let movementsStore: InstanceType<typeof MovementsStore>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({providers: [AccountsStore, CatalogStore, MovementsStore]});

    accountsStore = TestBed.inject(AccountsStore);
    movementsStore = TestBed.inject(MovementsStore);
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

  it('adds income to the source balance', () => {
    const target = accountsStore.createAccount({name: 'Ahorro', initialBalance: 0});
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
    const destination = accountsStore.createAccount({name: 'Ahorro', initialBalance: 200});
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
    const target = accountsStore.createAccount({name: 'Ahorro', initialBalance: 0});
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
      expect(accountsStore.createAccount({name: 'Fallback', initialBalance: 0})).toBeNull();
      expect(accountsStore.error()).toBe('crypto unavailable');
      expect(accountsStore.loaded()).toBe(false);
    } finally {
      crypto.randomUUID = randomUUID;
    }

    accountsStore.resetError();
    expect(accountsStore.error()).toBeNull();
  });

  it('filters movements and derives totals', () => {
    const account = accountsStore.createAccount({name: 'Ahorro', initialBalance: 0});
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
    const account = accountsStore.createAccount({name: 'Ahorro', initialBalance: 0});
    if (!account) throw new Error('account must be created');

    const before = account.currentBalance;
    accountsStore.togglePin(account.id);

    const updated = accountsStore.accounts().find((item) => item.id === account.id);
    expect(updated?.pinToHome).toBe(!account.pinToHome);
    expect(updated?.currentBalance).toBe(before);
  });
});
