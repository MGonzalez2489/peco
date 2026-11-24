/** Frozen monthly totals returned by period list and close endpoints (8.12/11.3). */
export interface PeriodSummaryResponse {
  period: string;
  startDate: string;
  endDate: string;
  globalInitialBalance: number;
  globalFinalBalance: number;
  totalInflows: number;
  totalOutflows: number;
  totalTransfers: number;
  totalTransactionsCount: number;
  closedAt: string;
}
