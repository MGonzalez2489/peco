import type {PeriodReportTotals} from '../types/period-report-totals.type';

/** Converts one period's ledger counters into the report totals of 8.13. */
export const buildPeriodReportTotals = (
  totalIncome: number,
  totalExpenses: number,
  transactionCount: number,
): PeriodReportTotals => ({
  totalIncome,
  totalExpenses,
  netBalance: totalIncome - totalExpenses,
  transactionCount,
});
