/** Aggregated outcome of one bounded multi-user backfill run (11.5). */
export interface PeriodBackfillResult {
  usersProcessed: number;
  closed: number;
  repaired: number;
  truncated: number;
  errors: number;
}
