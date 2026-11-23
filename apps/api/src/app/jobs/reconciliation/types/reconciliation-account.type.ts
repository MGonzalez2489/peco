/** Minimal account projection used by the reconciliation scan (9.9/D48). */
export interface ReconciliationAccount {
  id: number;
  publicId: string;
  userId: number;
  initialBalance: number;
  currentBalance: number;
}
