/** Internal catch-up knobs; the public HTTP contract exposes only `asOf` (10.6/US-607). */
export interface ApplyDueOptions {
  /** Restricts the job to schedules opted into automatic application (12). */
  autoApply?: boolean;
  /** Isolates unexpected per-schedule failures so one bad schedule cannot stop the batch. */
  onScheduleError?: (schedulePublicId: string, error: unknown) => void;
}
