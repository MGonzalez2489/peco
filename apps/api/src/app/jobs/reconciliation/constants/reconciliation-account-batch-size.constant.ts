/** Accounts scanned per query so the nightly job never loads the whole ledger at once (D50). */
export const RECONCILIATION_ACCOUNT_BATCH_SIZE = 200;
