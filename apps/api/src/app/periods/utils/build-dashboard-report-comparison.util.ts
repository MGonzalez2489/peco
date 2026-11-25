import type {DashboardReportComparison, DashboardReportTotals} from '@peco/contracts';

/** Extracts the documented previous-period comparison fields from a report's totals (8.13). */
export const buildDashboardReportComparison = (
  period: string,
  totals: DashboardReportTotals,
): DashboardReportComparison => ({
  period,
  totalIncome: totals.totalIncome,
  totalExpenses: totals.totalExpenses,
  netBalance: totals.netBalance,
});
