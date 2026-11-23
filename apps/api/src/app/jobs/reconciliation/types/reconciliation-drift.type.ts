/** One account whose stored balance disagrees with the ledger (9.9/D50). */
export interface ReconciliationDrift {
  userId: number;
  accountPublicId: string;
  expectedBalance: number;
  currentBalance: number;
  delta: number;
}
