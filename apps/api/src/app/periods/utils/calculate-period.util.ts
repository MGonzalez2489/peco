import {MovementTypeEnum} from '@peco/enums';
import type {AccountEntity} from '../../database/entities';
import {movementBalanceImpact} from '../../movements/utils/movement-balance-impact.util';
import type {PeriodAccountCalculation} from '../types/period-account-calculation.type';
import type {PeriodCalculation} from '../types/period-calculation.type';
import type {PeriodLedgerMovement} from '../types/period-ledger-movement.type';

const accumulate = (target: Map<number, number>, source: Map<number, number>): void => {
  for (const [accountId, delta] of source) {
    target.set(accountId, (target.get(accountId) ?? 0) + delta);
  }
};

/**
 * Projects accounts and ledger rows into one frozen month (11.3/11.4/D63).
 * The ledger alone supplies every balance: current account balances are never
 * read. Canceled rows are excluded from reports, so they move no money and are
 * not counted as transactions.
 */
export const calculatePeriod = (
  accounts: readonly AccountEntity[],
  movementsBefore: readonly PeriodLedgerMovement[],
  movementsInPeriod: readonly PeriodLedgerMovement[],
): PeriodCalculation => {
  const openingImpacts = new Map<number, number>();
  for (const movement of movementsBefore) {
    accumulate(
      openingImpacts,
      movementBalanceImpact(
        movement.type,
        movement.amount,
        movement.accountId,
        movement.targetAccountId,
        movement.isCanceled,
      ),
    );
  }

  const rows: PeriodAccountCalculation[] = accounts.map((account) => {
    const openingBalance = account.initialBalance + (openingImpacts.get(account.id) ?? 0);

    return {
      account,
      openingBalance,
      finalBalance: openingBalance,
      totalTransactions: 0,
      totalInflows: 0,
      totalOutflows: 0,
      totalTransfers: 0,
    };
  });
  const byAccount = new Map(rows.map((row) => [row.account.id, row]));

  let totalTransactionsCount = 0;
  for (const movement of movementsInPeriod) {
    if (movement.isCanceled) {
      continue;
    }

    totalTransactionsCount += 1;
    const impact = movementBalanceImpact(
      movement.type,
      movement.amount,
      movement.accountId,
      movement.targetAccountId,
    );

    for (const [accountId, delta] of impact) {
      const row = byAccount.get(accountId);
      if (!row) {
        continue;
      }

      row.finalBalance += delta;
      row.totalTransactions += 1;
      row.totalTransfers += movement.type === MovementTypeEnum.TRANSFER.toString() ? delta : 0;

      if (movement.type === MovementTypeEnum.INCOME.toString() && movement.accountId === accountId) {
        row.totalInflows += movement.amount;
      }
      if (
        movement.type === MovementTypeEnum.EXPENSE.toString() &&
        movement.accountId === accountId
      ) {
        row.totalOutflows += movement.amount;
      }
    }
  }

  return {
    accountBalances: rows,
    globalInitialBalance: rows.reduce((sum, row) => sum + row.openingBalance, 0),
    globalFinalBalance: rows.reduce((sum, row) => sum + row.finalBalance, 0),
    totalInflows: rows.reduce((sum, row) => sum + row.totalInflows, 0),
    totalOutflows: rows.reduce((sum, row) => sum + row.totalOutflows, 0),
    totalTransfers: rows.reduce((sum, row) => sum + row.totalTransfers, 0),
    totalTransactionsCount,
  };
};
