/** Accepted period and month-range query for EP-08 reports; the API owns all defaults (8.4/Q8/US-806). */
export interface ReportPeriodQuery {
  period?: string;
  from?: string;
  to?: string;
}
