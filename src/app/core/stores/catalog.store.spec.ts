import {TestBed} from '@angular/core/testing';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {Category} from '../models/category.model';
import {AccountsStore} from './accounts.store';
import {CatalogStore} from './catalog.store';
import {MovementsStore} from './movements.store';
import {ScheduledTransactionsStore} from './scheduled-transactions.store';

describe('CatalogStore categories management', () => {
  let catalogStore: InstanceType<typeof CatalogStore>;
  let movementsStore: InstanceType<typeof MovementsStore>;
  let accountsStore: InstanceType<typeof AccountsStore>;
  let scheduledStore: InstanceType<typeof ScheduledTransactionsStore>;

  const seedCategory = (): Omit<Category, 'id'> => ({
    name: 'alquiler',
    displayName: 'Alquiler',
    icon: 'house',
    color: '#EC4899',
    applyType: 'EXPENSE',
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AccountsStore, CatalogStore, MovementsStore, ScheduledTransactionsStore],
    });

    catalogStore = TestBed.inject(CatalogStore);
    movementsStore = TestBed.inject(MovementsStore);
    accountsStore = TestBed.inject(AccountsStore);
    scheduledStore = TestBed.inject(ScheduledTransactionsStore);
  });

  it('seeds categories with lucide icons, hex colors and a root category', () => {
    const categories = catalogStore.categories();

    expect(categories.length).toBeGreaterThan(0);
    expect(catalogStore.rootCategory()?.id).toBe('unknown');
    expect(catalogStore.rootCategory()?.isRoot).toBe(true);
    expect(categories.every((category) => category.icon.length > 0)).toBe(true);
    expect(categories.every((category) => /^#[0-9A-Fa-f]{6}$/.test(category.color))).toBe(true);
  });

  it('persists categories to local storage', () => {
    const created = catalogStore.addCategory(seedCategory());
    if (!created) throw new Error('category must be created');

    const persisted = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_KEYS.categories) ?? '[]',
    ) as Category[];

    expect(persisted.some((category) => category.id === created.id)).toBe(true);
    expect(catalogStore.categoryById(created.id)?.displayName).toBe('Alquiler');
  });

  it('keeps the root category out of the default category resolution', () => {
    expect(catalogStore.defaultCategoryIdFor('INCOME')).toBe('payroll');
    expect(catalogStore.defaultCategoryIdFor('EXPENSE')).toBe('services');
    expect(catalogStore.defaultCategoryIdFor('TRANSFER')).toBe('transfer');
  });

  it('rejects updates and deletion of the root category', () => {
    const before = catalogStore.categories();

    catalogStore.updateCategory('unknown', {displayName: 'Renombrada', color: '#000000'});
    expect(catalogStore.deleteCategory('unknown')).toBe(false);

    expect(catalogStore.rootCategory()?.displayName).toBe('Otros');
    expect(catalogStore.categories()).toEqual(before);
  });

  it('updates name, color and icon of a non-root category', () => {
    const created = catalogStore.addCategory(seedCategory());
    if (!created) throw new Error('category must be created');

    catalogStore.updateCategory(created.id, {
      displayName: 'Alquiler y Mortgage',
      color: '#10B981',
      icon: 'piggy-bank',
    });

    const updated = catalogStore.categoryById(created.id);
    expect(updated?.displayName).toBe('Alquiler y Mortgage');
    expect(updated?.color).toBe('#10B981');
    expect(updated?.icon).toBe('piggy-bank');
    expect(updated?.id).toBe(created.id);
    expect(updated?.name).toBe(created.name);
  });

  it('reassigns movements and schedules to the root category on deletion', () => {
    const created = catalogStore.addCategory(seedCategory());
    if (!created) throw new Error('category must be created');

    const account = accountsStore.accounts()[0];

    movementsStore.registerMovement({
      accountId: account.id,
      categoryId: created.id,
      type: 'EXPENSE',
      amount: 25,
      note: 'Renta mensual',
    });

    scheduledStore.createScheduledTransaction({
      name: 'Vacunas',
      estimatedAmount: 40,
      type: 'EXPENSE',
      categoryId: created.id,
      sourceAccountId: account.id,
      frequency: 'MONTHLY',
      nextExecutionDate: '2030-03-01',
      autoApply: false,
      active: true,
    });

    expect(catalogStore.deleteCategory(created.id)).toBe(true);

    expect(catalogStore.categoryById(created.id)).toBeNull();
    expect(movementsStore.movements().length).toBe(1);
    expect(movementsStore.movements()[0].categoryId).toBe('unknown');
    expect(movementsStore.movements()[0].amount).toBe(25);
    expect(scheduledStore.scheduledTransactions().length).toBe(1);
    expect(scheduledStore.scheduledTransactions()[0].categoryId).toBe('unknown');
  });

  it('restores the root category when persistence lost it', () => {
    const stored = catalogStore
      .categories()
      .filter((category) => category.id !== 'unknown')
      .map((category) => ({...category}));

    localStorage.setItem(LOCAL_STORAGE_KEYS.categories, JSON.stringify(stored));
    catalogStore.loadCatalogs();

    expect(catalogStore.rootCategory()?.id).toBe('unknown');
    expect(catalogStore.categories().length).toBe(stored.length + 1);
  });
});
