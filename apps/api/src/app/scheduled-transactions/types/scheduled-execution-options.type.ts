/** Optional D58 policy for the shared single-occurrence executor. */
export interface ScheduledExecutionOptions {
  /** Occurrences applied before this UTC date are skipped without a movement. */
  inactiveBefore?: string | null;
}
