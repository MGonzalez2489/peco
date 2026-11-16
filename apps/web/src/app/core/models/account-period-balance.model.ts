/**
 * Closed monthly totals for a single account, embedded inside a
 * `PeriodSnapshot`. Every monetary field is stored as integer cents.
 */
export interface AccountPeriodBalance {
  accountId: string;
  /** Account balance at the start of the period, in cents. */
  initialBalance: number;
  /** Account balance at the close of the period, in cents. */
  finalBalance: number;
  /** Count of settled movements that affected the account during the period. */
  totalTransactions: number;
  /** Income amount booked into the account during the period, in cents. */
  totalInflows: number;
  /** Expense amount booked into the account during the period, in cents. */
  totalOutflows: number;
  /** Signed net transfer movement of the account during the period, in cents. */
  totalTransfers: number;
}
