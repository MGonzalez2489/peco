import {Account} from './account.model';
import {Movement} from './movement.model';
import {buildPeriodSnapshot} from '../utils/build-period-snapshot.util';

const ACCOUNT: Account = {
  id: 'c-cash',
  name: 'Efectivo',
  currentBalance: 115000,
  type: 'CASH',
  includeInTotal: true,
  createdAt: '2026-10-05T12:00:00.000Z',
};

const LATE_ACCOUNT: Account = {
  id: 'c-late',
  name: 'Cuenta nueva',
  currentBalance: 0,
  type: 'SAVINGS',
  includeInTotal: true,
  createdAt: '2026-11-05T12:00:00.000Z',
};

const MOVEMENTS: Movement[] = [
  {
    id: 'm-1',
    accountId: 'c-cash',
    categoryId: 'services',
    type: 'EXPENSE',
    amount: 25000,
    date: '2026-10-10T12:00:00.000Z',
  },
  {
    id: 'm-2',
    accountId: 'c-cash',
    categoryId: 'salary',
    type: 'INCOME',
    amount: 50000,
    date: '2026-10-20T12:00:00.000Z',
  },
  {
    id: 'm-3',
    accountId: 'c-cash',
    categoryId: 'services',
    type: 'TRANSFER',
    amount: 10000,
    targetAccountId: 'c-bank',
    date: '2026-10-25T12:00:00.000Z',
  },
];

describe('PeriodSnapshot', () => {
  it('builds the monthly wrapper with integer cents and the UTC period range', () => {
    const snapshot = buildPeriodSnapshot({
      accounts: [ACCOUNT, LATE_ACCOUNT],
      movements: MOVEMENTS,
      period: '2026-10',
      now: new Date('2026-11-01T00:00:00.000Z'),
    });

    expect(snapshot.id).toBe('snap-2026-10');
    expect(snapshot.period).toBe('2026-10');
    expect(snapshot.startDate).toBe('2026-10-01T00:00:00.000Z');
    expect(snapshot.endDate).toBe('2026-10-31T23:59:59.999Z');
    expect(snapshot.createdAt).toBe('2026-11-01T00:00:00.000Z');
    expect(snapshot.updatedAt).toBe(snapshot.createdAt);
  });

  it('aggregates the global totals from the account breakdown in cents', () => {
    const snapshot = buildPeriodSnapshot({
      accounts: [ACCOUNT, LATE_ACCOUNT],
      movements: MOVEMENTS,
      period: '2026-10',
      now: new Date('2026-11-01T00:00:00.000Z'),
    });

    // Accounts created after the period are excluded from the breakdown.
    expect(snapshot.accountBalances).toHaveLength(1);
    expect(snapshot.accountBalances[0]).toEqual({
      accountId: 'c-cash',
      initialBalance: 100000,
      finalBalance: 115000,
      totalTransactions: 3,
      totalInflows: 50000,
      totalOutflows: 25000,
      totalTransfers: -10000,
    });
    expect(snapshot).toMatchObject({
      globalInitialBalance: 100000,
      globalFinalBalance: 115000,
      totalInflows: 50000,
      totalOutflows: 25000,
      totalTransfers: -10000,
      totalTransactionsCount: 3,
    });

    const monetaryFields = [
      snapshot.globalInitialBalance,
      snapshot.globalFinalBalance,
      snapshot.totalInflows,
      snapshot.totalOutflows,
      snapshot.totalTransfers,
      ...snapshot.accountBalances.flatMap((balance) => [
        balance.initialBalance,
        balance.finalBalance,
        balance.totalInflows,
        balance.totalOutflows,
        balance.totalTransfers,
      ]),
    ];

    for (const value of monetaryFields) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});
