import type {ScheduledTransactionCursor} from '../types/scheduled-transaction-cursor.type';

/** Base64url JSON cursor for `nextExecutionDate ASC, id ASC` ordering (8.11/US-602). */
export const encodeScheduledTransactionCursor = (cursor: ScheduledTransactionCursor): string =>
  Buffer.from(JSON.stringify({d: cursor.date, i: cursor.id}), 'utf8').toString('base64url');
