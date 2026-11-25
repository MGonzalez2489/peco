import type {DashboardReportBalances} from './dashboard-report-balances.type';
import type {DashboardReportComparison} from './dashboard-report-comparison.type';
import type {DashboardReportTotals} from './dashboard-report-totals.type';
import type {ReportPeriodStatus} from './report-period-status.type';

/** Dashboard report returned by `GET /reports/dashboard` (8.13). */
export interface DashboardReportResponse {
  period: string;
  status: ReportPeriodStatus;
  totals: DashboardReportTotals;
  balances: DashboardReportBalances;
  comparison: DashboardReportComparison | null;
}
