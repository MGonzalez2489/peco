/** Outcome of one scheduled reconciliation attempt (US-510). */
export interface ReconciliationResult {
  acquired: boolean;
  scannedAccounts: number;
  mismatches: number;
}
