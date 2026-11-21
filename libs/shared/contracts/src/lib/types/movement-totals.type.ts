/**
 * Whole-filter ledger totals returned as `meta.totals` by `GET /movements` (8.10/D38/D101).
 * Transfers are counted once in `count` and never double-counted in the amounts (D63).
 */
export interface MovementTotals {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  count: number;
}
