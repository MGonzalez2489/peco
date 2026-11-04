import {TestBed} from '@angular/core/testing';
import {AMOUNT_SCHEMA_VERSION} from '../constants/amount-schema-version.constant';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {toPeriod} from '../utils/to-period.util';
import {AccountsStore} from './accounts.store';
import {CatalogStore} from './catalog.store';
import {MovementsStore} from './movements.store';
import {PeriodSnapshotsStore} from './period-snapshots.store';

const NOVEMBER_FIRST = new Date('2026-11-01T12:00:00.000Z');

describe('PeriodSnapshotsStore', () => {
  let accountsStore: InstanceType<typeof AccountsStore>;
  let movementsStore: InstanceType<typeof MovementsStore>;
  let snapshotsStore: InstanceType<typeof PeriodSnapshotsStore>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AccountsStore, CatalogStore, MovementsStore, PeriodSnapshotsStore],
    });

    accountsStore = TestBed.inject(AccountsStore);
    movementsStore = TestBed.inject(MovementsStore);
    snapshotsStore = TestBed.inject(PeriodSnapshotsStore);
  });

  const createAccount = (createdAt: string, initialBalance = 100000): string => {
    const account = accountsStore.createAccount({
      name: 'Cuenta de prueba',
      initialBalance,
      type: 'SAVINGS',
      createdAt,
    });
    if (!account) throw new Error('account must be created');

    return account.id;
  };

  it('closes the previous period on the first day of a new month', () => {
    const accountId = createAccount('2026-10-05T12:00:00.000Z');
    const rootId = accountsStore.rootAccount()?.id ?? '';

    movementsStore.registerMovement({
      accountId,
      categoryId: 'services',
      type: 'EXPENSE',
      amount: 25000,
      date: '2026-10-10T12:00:00.000Z',
    });
    movementsStore.registerMovement({
      accountId,
      categoryId: 'salary',
      type: 'INCOME',
      amount: 50000,
      date: '2026-10-20T12:00:00.000Z',
    });
    movementsStore.registerMovement({
      accountId,
      categoryId: 'services',
      type: 'TRANSFER',
      amount: 10000,
      targetAccountId: rootId,
      date: '2026-10-25T12:00:00.000Z',
    });

    const created = snapshotsStore.verifyAndClosePreviousPeriods(NOVEMBER_FIRST);

    expect(created).toBe(1);
    expect(snapshotsStore.hasSnapshotForPeriod()('2026-10')).toBe(true);
    expect(snapshotsStore.hasSnapshotForPeriod()('2026-11')).toBe(false);

    const snapshot = snapshotsStore.snapshotFor()('2026-10');
    expect(snapshot).toMatchObject({
      id: 'snap-2026-10',
      period: '2026-10',
      startDate: '2026-10-01T00:00:00.000Z',
      endDate: '2026-10-31T23:59:59.999Z',
      globalInitialBalance: 100000,
      globalFinalBalance: 125000,
      totalInflows: 50000,
      totalOutflows: 25000,
      // Internal transfers cancel out when every account is included.
      totalTransfers: 0,
      totalTransactionsCount: 4,
    });
    expect(snapshot?.accountBalances).toContainEqual({
      accountId,
      initialBalance: 100000,
      finalBalance: 115000,
      totalTransactions: 3,
      totalInflows: 50000,
      totalOutflows: 25000,
      totalTransfers: -10000,
    });
    expect(snapshot?.accountBalances).toContainEqual({
      accountId: rootId,
      initialBalance: 0,
      finalBalance: 10000,
      totalTransactions: 1,
      totalInflows: 0,
      totalOutflows: 0,
      totalTransfers: 10000,
    });

    expect(snapshotsStore.snapshotMap()['2026-10']).toBe(snapshot);
    expect(snapshotsStore.closedPeriodCount()).toBe(1);

    const persisted = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_KEYS.periodSnapshots) ?? '[]',
    ) as unknown[];
    expect(persisted).toHaveLength(1);
  });

  it('does not duplicate or rewrite a wrapper when the same month reopens', () => {
    const accountId = createAccount('2026-10-05T12:00:00.000Z');

    movementsStore.registerMovement({
      accountId,
      categoryId: 'salary',
      type: 'INCOME',
      amount: 50000,
      date: '2026-10-20T12:00:00.000Z',
    });

    expect(snapshotsStore.verifyAndClosePreviousPeriods(NOVEMBER_FIRST)).toBe(1);
    expect(snapshotsStore.verifyAndClosePreviousPeriods(NOVEMBER_FIRST)).toBe(0);

    // A backdated movement must never rewrite an already closed period.
    movementsStore.registerMovement({
      accountId,
      categoryId: 'services',
      type: 'EXPENSE',
      amount: 5000,
      date: '2026-10-28T12:00:00.000Z',
    });

    expect(snapshotsStore.verifyAndClosePreviousPeriods(NOVEMBER_FIRST)).toBe(0);

    const snapshot = snapshotsStore.snapshotFor()('2026-10');
    expect(snapshot?.globalFinalBalance).toBe(150000);
    expect(snapshot?.accountBalances).toHaveLength(1);
    expect(snapshot?.accountBalances[0]).toMatchObject({
      accountId,
      initialBalance: 100000,
      finalBalance: 150000,
      totalTransactions: 1,
    });
  });

  it('closes every missing month of a multi-month gap sequentially', () => {
    const accountId = createAccount('2026-07-10T12:00:00.000Z');
    const register = (type: 'INCOME' | 'EXPENSE', amount: number, date: string): void => {
      movementsStore.registerMovement({accountId, categoryId: 'services', type, amount, date});
    };

    register('EXPENSE', 10000, '2026-07-15T12:00:00.000Z');
    register('INCOME', 20000, '2026-08-15T12:00:00.000Z');
    register('EXPENSE', 5000, '2026-09-15T12:00:00.000Z');
    register('EXPENSE', 7000, '2026-10-15T12:00:00.000Z');

    const created = snapshotsStore.verifyAndClosePreviousPeriods(
      new Date('2026-11-04T12:00:00.000Z'),
    );

    expect(created).toBe(4);

    const wrappers = [...snapshotsStore.snapshots()].sort((a, b) =>
      a.period.localeCompare(b.period),
    );

    expect(
      wrappers.map(({period, globalInitialBalance, globalFinalBalance}) => ({
        period,
        globalInitialBalance,
        globalFinalBalance,
      })),
    ).toEqual([
      {period: '2026-07', globalInitialBalance: 100000, globalFinalBalance: 90000},
      {period: '2026-08', globalInitialBalance: 90000, globalFinalBalance: 110000},
      {period: '2026-09', globalInitialBalance: 110000, globalFinalBalance: 105000},
      {period: '2026-10', globalInitialBalance: 105000, globalFinalBalance: 98000},
    ]);

    for (const wrapper of wrappers) {
      expect(wrapper.accountBalances).toHaveLength(1);
      expect(wrapper.totalTransactionsCount).toBe(1);
    }

    for (let index = 1; index < wrappers.length; index++) {
      expect(wrappers[index].globalInitialBalance).toBe(wrappers[index - 1].globalFinalBalance);
    }
  });

  it('anchors a new period to the frozen final balance of the previous wrapper', () => {
    TestBed.resetTestingModule();
    localStorage.clear();
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.accounts,
      JSON.stringify([
        {
          id: 'root',
          name: 'Efectivo',
          currentBalance: 0,
          type: 'CASH',
          includeInTotal: true,
          createdAt: '2026-09-01T12:00:00.000Z',
          isRoot: true,
        },
        {
          id: 'acc-1',
          name: 'Ahorro',
          currentBalance: 200000,
          type: 'SAVINGS',
          includeInTotal: true,
          createdAt: '2026-09-10T12:00:00.000Z',
        },
      ]),
    );
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.periodSnapshots,
      JSON.stringify([
        {
          id: 'snap-2026-09',
          period: '2026-09',
          startDate: '2026-09-01T00:00:00.000Z',
          endDate: '2026-09-30T23:59:59.999Z',
          globalInitialBalance: 500000,
          globalFinalBalance: 500000,
          totalInflows: 0,
          totalOutflows: 0,
          totalTransfers: 0,
          totalTransactionsCount: 0,
          accountBalances: [
            {
              accountId: 'acc-1',
              initialBalance: 500000,
              finalBalance: 500000,
              totalTransactions: 0,
              totalInflows: 0,
              totalOutflows: 0,
              totalTransfers: 0,
            },
          ],
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
        },
      ]),
    );
    localStorage.setItem(LOCAL_STORAGE_KEYS.schemaVersion, AMOUNT_SCHEMA_VERSION);

    TestBed.configureTestingModule({
      providers: [AccountsStore, CatalogStore, MovementsStore, PeriodSnapshotsStore],
    });
    TestBed.inject(AccountsStore);
    TestBed.inject(MovementsStore);
    const store = TestBed.inject(PeriodSnapshotsStore);

    store.verifyAndClosePreviousPeriods(NOVEMBER_FIRST);

    expect(store.snapshotFor()('2026-09')?.globalFinalBalance).toBe(500000);
    expect(store.snapshotFor()('2026-10')).toMatchObject({
      globalInitialBalance: 500000,
      globalFinalBalance: 500000,
    });
    expect(
      store
        .snapshotFor()('2026-10')
        ?.accountBalances.find((balance) => balance.accountId === 'acc-1'),
    ).toMatchObject({initialBalance: 500000, finalBalance: 500000});
  });

  it('closes the previous period during store initialization', () => {
    TestBed.resetTestingModule();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AccountsStore, CatalogStore, MovementsStore, PeriodSnapshotsStore],
    });

    const accounts = TestBed.inject(AccountsStore);
    const movements = TestBed.inject(MovementsStore);

    const previousMonth = new Date();
    previousMonth.setDate(1);
    previousMonth.setMonth(previousMonth.getMonth() - 1);

    const account = accounts.createAccount({
      name: 'Cuenta',
      initialBalance: 5000,
      type: 'CASH',
      createdAt: new Date(
        previousMonth.getFullYear(),
        previousMonth.getMonth(),
        10,
        12,
      ).toISOString(),
    });
    if (!account) throw new Error('account must be created');

    movements.registerMovement({
      accountId: account.id,
      categoryId: 'services',
      type: 'EXPENSE',
      amount: 1000,
      date: new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 15, 12).toISOString(),
    });

    const store = TestBed.inject(PeriodSnapshotsStore);
    const period = toPeriod(previousMonth);

    expect(store.hasSnapshotForPeriod()(period)).toBe(true);
    expect(store.snapshotFor()(period)?.globalFinalBalance).toBe(4000);
  });
});
