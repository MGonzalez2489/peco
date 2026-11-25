import {AccountTypeEnum, MovementTypeEnum} from '@peco/enums';
import type {AccountEntity, MovementEntity} from '../../database/entities';
import type {PeriodLedgerMovement} from '../types/period-ledger-movement.type';
import {calculatePeriod} from './calculate-period.util';

const account = (id: number, initialBalance: number): AccountEntity =>
  ({
    id,
    publicId: `account-${id}`,
    name: `Cuenta ${id}`,
    type: AccountTypeEnum.CASH.toString(),
    initialBalance,
    color: '#10B981',
    icon: 'banknote',
    includeInTotal: true,
  }) as AccountEntity;

const movement = (
  id: number,
  type: string,
  amount: number,
  accountId: number,
  targetAccountId: number | null = null,
  isCanceled = false,
): PeriodLedgerMovement =>
  ({
    id,
    date: '2026-10-05T12:00:00.000Z',
    type,
    amount,
    accountId,
    targetAccountId,
    isCanceled,
  }) as MovementEntity as PeriodLedgerMovement;

describe('calculatePeriod (11.3/D63)', () => {
  it('derives openings from the ledger and never reads currentBalance', () => {
    const accounts = [account(1, 100_000)];
    const before = [movement(1, MovementTypeEnum.INCOME.toString(), 50_000, 1)];
    const current = [movement(2, MovementTypeEnum.EXPENSE.toString(), 20_000, 1)];

    const result = calculatePeriod(accounts, before, current);
    const row = result.accountBalances[0];

    expect(row.openingBalance).toBe(150_000);
    expect(row.finalBalance).toBe(130_000);
    expect(row.openingBalance + row.totalInflows - row.totalOutflows + row.totalTransfers).toBe(
      row.finalBalance,
    );
    expect(result.globalInitialBalance).toBe(150_000);
    expect(result.globalFinalBalance).toBe(130_000);
  });

  it('counts a transfer once globally and twice in the account rows', () => {
    const accounts = [account(1, 100_000), account(2, 0)];
    const current = [
      movement(1, MovementTypeEnum.TRANSFER.toString(), 30_000, 1, 2),
    ];

    const result = calculatePeriod(accounts, [], current);

    expect(result.totalTransactionsCount).toBe(1);
    expect(result.accountBalances.map((row) => row.totalTransactions)).toEqual([1, 1]);
    expect(result.accountBalances.map((row) => row.totalTransfers)).toEqual([-30_000, 30_000]);
    expect(result.totalTransfers).toBe(0);
    expect(result.globalFinalBalance).toBe(100_000);
  });

  it('nets an in-month reversal pair to zero while counting both rows', () => {
    const accounts = [account(1, 100_000)];
    const current = [
      movement(1, MovementTypeEnum.INCOME.toString(), 50_000, 1),
      movement(2, MovementTypeEnum.EXPENSE.toString(), 50_000, 1),
    ];

    const result = calculatePeriod(accounts, [], current);

    expect(result.totalTransactionsCount).toBe(2);
    expect(result.totalInflows).toBe(50_000);
    expect(result.totalOutflows).toBe(50_000);
    expect(result.globalInitialBalance).toBe(100_000);
    expect(result.globalFinalBalance).toBe(100_000);
    expect(result.accountBalances[0].totalTransactions).toBe(2);
    expect(result.accountBalances[0].finalBalance).toBe(100_000);
  });

  it('excludes canceled movements from balances, counters and reports', () => {
    const accounts = [account(1, 100_000)];
    const current = [
      movement(1, MovementTypeEnum.INCOME.toString(), 40_000, 1),
      movement(2, MovementTypeEnum.INCOME.toString(), 99_000, 1, null, true),
    ];

    const result = calculatePeriod(accounts, [], current);

    expect(result.totalTransactionsCount).toBe(1);
    expect(result.totalInflows).toBe(40_000);
    expect(result.accountBalances[0].finalBalance).toBe(140_000);
  });

  it('keeps empty months with an unchanged opening and zero counters', () => {
    const result = calculatePeriod([account(1, 42_000)], [], []);

    expect(result.globalInitialBalance).toBe(42_000);
    expect(result.globalFinalBalance).toBe(42_000);
    expect(result.totalTransactionsCount).toBe(0);
    expect(result.accountBalances[0].totalTransactions).toBe(0);
  });
});
