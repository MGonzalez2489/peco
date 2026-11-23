/** Explicit active state for `PATCH /scheduled-transactions/:publicId/toggle` (8.11/US-603). */
export interface ToggleScheduledTransactionRequest {
  active: boolean;
  version?: number;
}
