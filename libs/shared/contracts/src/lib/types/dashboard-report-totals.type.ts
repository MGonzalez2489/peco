/** Dashboard income, expenses and transaction count for one UTC period, in integer cents. */
export interface DashboardReportTotals {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
}
