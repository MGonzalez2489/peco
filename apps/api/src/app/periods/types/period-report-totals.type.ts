/** Dashboard-style totals for one UTC period, in integer cents (8.13). */
export interface PeriodReportTotals {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
}
