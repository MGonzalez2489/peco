/** Keyset position for schedule pages; only the opaque encoded form reaches clients (8.4). */
export interface ScheduledTransactionCursor {
  date: string;
  id: number;
}
