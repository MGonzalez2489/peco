/** Bounded outcome of one nightly auto-apply run (US-607). */
export interface AutoApplyResult {
  acquired: boolean;
  usersProcessed: number;
  applied: number;
  skipped: number;
  failed: number;
  skippedWhileInactive: number;
  errors: number;
}
