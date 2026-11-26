/** Bounded outcome of one daily retention run (US-1003). */
export interface CleanupResult {
  acquired: boolean;
  idempotencyKeys: number;
  refreshTokens: number;
  auditLogs: number;
}
