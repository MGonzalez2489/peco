/** Credit capacity at the end of a reported month, in integer cents (8.13). */
export interface AccountProgressionCreditUsage {
  limit: number;
  used: number;
  available: number;
  availablePercentage: number;
}
