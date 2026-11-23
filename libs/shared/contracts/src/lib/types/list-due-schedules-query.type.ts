/** Query for the read-only due preview; `asOf` defaults to today in UTC (8.11/US-606). */
export interface ListDueSchedulesQuery {
  asOf?: string;
  autoApply?: boolean;
}
