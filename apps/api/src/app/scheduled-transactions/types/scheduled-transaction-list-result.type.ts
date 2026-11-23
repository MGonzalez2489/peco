import type {ScheduledTransactionEntity} from '../../database/entities';

/** One keyset page plus the cursor for the next page (8.4/US-602). */
export interface ScheduledTransactionListResult {
  items: ScheduledTransactionEntity[];
  nextCursor: string | null;
}
