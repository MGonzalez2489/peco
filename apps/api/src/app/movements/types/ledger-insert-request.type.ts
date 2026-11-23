import type {CreateMovementRequest} from '@peco/contracts';

/** Internal ledger insert body; scheduled executions link their movement by internal id (10.5/US-604). */
export interface LedgerInsertRequest extends CreateMovementRequest {
  scheduledTransactionId?: number | null;
}
