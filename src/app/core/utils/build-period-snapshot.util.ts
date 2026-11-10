import {AccountPeriodBalance} from '../models/account-period-balance.model';
import {Account} from '../models/account.model';
import {Movement} from '../models/movement.model';
import {PeriodSnapshot} from '../models/period-snapshot.model';
import {movementBalanceImpact} from './movement-balance-impact.util';
import {periodRange} from './period-range.util';
import {toPeriod} from './to-period.util';

interface BuildPeriodSnapshotParams {
  accounts: readonly Account[];
  movements: readonly Movement[];
  /** Closed month in `YYYY-MM` format. */
  period: string;
  /** Snapshot of the immediately previous period, used to anchor balances. */
  previousSnapshot?: PeriodSnapshot | null;
  now?: Date;
}

const affectsAccount = (movement: Movement, accountId: string): boolean =>
  movement.accountId === accountId || movement.targetAccountId === accountId;

/**
 * Earliest month in which an account had activity: its creation month or the
 * oldest settled movement, whichever happened first.
 */
const resolveEarliestPeriod = (account: Account, movements: readonly Movement[]): string => {
  const periods = [
    toPeriod(account.createdAt),
    ...movements
      .filter((movement) => !movement.isCanceled && affectsAccount(movement, account.id))
      .map((movement) => toPeriod(movement.date)),
  ].filter((period) => period !== '');

  if (periods.length === 0) return '';

  return periods.reduce((earliest, period) => (period < earliest ? period : earliest));
};

/**
 * Builds the closed totals of one account for the period. Accounts created
 * after the period (and without movements inside it) are excluded.
 */
const buildAccountPeriodBalance = (
  account: Account,
  movements: readonly Movement[],
  period: string,
  previousSnapshot: PeriodSnapshot | null,
): AccountPeriodBalance | null => {
  const earliestPeriod = resolveEarliestPeriod(account, movements);
  if (!earliestPeriod || earliestPeriod > period) return null;

  let impactFromPeriodStart = 0;
  let periodImpact = 0;
  let totalTransactions = 0;
  let totalInflows = 0;
  let totalOutflows = 0;
  let totalTransfers = 0;

  for (const movement of movements) {
    if (movement.isCanceled || !affectsAccount(movement, account.id)) continue;

    const movementPeriod = toPeriod(movement.date);
    if (!movementPeriod) continue;

    const impact = movementBalanceImpact(movement, account.id);

    if (movementPeriod >= period) {
      impactFromPeriodStart += impact;
    }

    if (movementPeriod !== period) continue;

    totalTransactions += 1;
    periodImpact += impact;

    if (movement.type === 'INCOME' && movement.accountId === account.id) {
      totalInflows += movement.amount;
    }

    if (movement.type === 'EXPENSE' && movement.accountId === account.id) {
      totalOutflows += movement.amount;
    }

    if (movement.type === 'TRANSFER') {
      totalTransfers += impact;
    }
  }

  // A frozen previous period anchors the audit chain; otherwise the initial
  // balance is reconstructed from the live balance by removing every movement
  // dated inside or after the period.
  const previous = previousSnapshot?.accountBalances.find(
    (balance) => balance.accountId === account.id,
  );
  const initialBalance = previous
    ? previous.finalBalance
    : account.currentBalance - impactFromPeriodStart;

  return {
    accountId: account.id,
    initialBalance,
    finalBalance: initialBalance + periodImpact,
    totalTransactions,
    totalInflows,
    totalOutflows,
    totalTransfers,
  };
};

/**
 * Builds the immutable monthly wrapper that groups the global period totals
 * and the per-account breakdown. Canceled movements never affect the snapshot
 * because they have no balance impact.
 */
export const buildPeriodSnapshot = ({
  accounts,
  movements,
  period,
  previousSnapshot = null,
  now = new Date(),
}: BuildPeriodSnapshotParams): PeriodSnapshot => {
  const accountBalances = accounts
    .map((account) => buildAccountPeriodBalance(account, movements, period, previousSnapshot))
    .filter((balance): balance is AccountPeriodBalance => balance !== null);

  const totals = accountBalances.reduce(
    (accumulator, balance) => ({
      globalInitialBalance: accumulator.globalInitialBalance + balance.initialBalance,
      globalFinalBalance: accumulator.globalFinalBalance + balance.finalBalance,
      totalInflows: accumulator.totalInflows + balance.totalInflows,
      totalOutflows: accumulator.totalOutflows + balance.totalOutflows,
      totalTransfers: accumulator.totalTransfers + balance.totalTransfers,
      totalTransactionsCount: accumulator.totalTransactionsCount + balance.totalTransactions,
    }),
    {
      globalInitialBalance: 0,
      globalFinalBalance: 0,
      totalInflows: 0,
      totalOutflows: 0,
      totalTransfers: 0,
      totalTransactionsCount: 0,
    },
  );

  const timestamp = now.toISOString();
  const {startDate, endDate} = periodRange(period);

  return {
    id: `snap-${period}`,
    period,
    startDate,
    endDate,
    ...totals,
    accountBalances,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};
