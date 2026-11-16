import {AccountPeriodBalance} from './account-period-balance.model';

/**
 * Immutable monthly wrapper that groups the global period totals and the
 * per-account breakdown of a closed month.
 */
export interface PeriodSnapshot {
  /** Deterministic identifier (`snap-YYYY-MM`). */
  id: string;
  /** Closed month in `YYYY-MM` format (for example `2026-10`). */
  period: string;
  /** ISO timestamp of the first instant of the period. */
  startDate: string;
  /** ISO timestamp of the last instant of the period. */
  endDate: string;

  /** Sum of every account initial balance, in cents. */
  globalInitialBalance: number;
  /** Sum of every account final balance, in cents. */
  globalFinalBalance: number;
  /** Sum of every account income amount, in cents. */
  totalInflows: number;
  /** Sum of every account expense amount, in cents. */
  totalOutflows: number;
  /** Sum of every account signed net transfer movement, in cents. */
  totalTransfers: number;
  /** Sum of every account settled movement count. */
  totalTransactionsCount: number;

  /** Card-level breakdown with one entry per active account. */
  accountBalances: AccountPeriodBalance[];

  /** ISO timestamp of the snapshot creation. */
  createdAt: string;
  /** ISO timestamp of the last modification of the snapshot. */
  updatedAt: string;
}
