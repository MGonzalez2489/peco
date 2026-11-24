/** Bounded outcome of one nightly auto-apply run (US-607/US-704). */
export interface AutoApplyResult {
  acquired: boolean;
  usersProcessed: number;
  applied: number;
  skipped: number;
  failed: number;
  skippedWhileInactive: number;
  errors: number;
  /** Users still pending a postponed close because their batch hit the cap. */
  cappedUserPublicIds: string[];
}
