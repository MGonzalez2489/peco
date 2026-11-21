/** Updated balance returned after an account mutation (8.8/US-305). */
export interface AccountBalanceUpdate {
  accountPublicId: string;
  currentBalance: number;
  version: number;
}
