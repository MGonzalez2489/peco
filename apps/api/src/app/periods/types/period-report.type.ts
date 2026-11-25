import type {DashboardReportComparison, ReportPeriodStatus} from '@peco/contracts';
import type {PeriodReportBalances} from './period-report-balances.type';
import type {PeriodReportTotals} from './period-report-totals.type';

/** Period figures from an immutable snapshot or, when none exists, the live ledger (11.6). */
export interface PeriodReport {
  period: string;
  frozen: boolean;
  status: ReportPeriodStatus;
  totals: PeriodReportTotals;
  balances: PeriodReportBalances;
  comparison: DashboardReportComparison | null;
}
