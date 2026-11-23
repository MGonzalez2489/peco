import type {MovementResponse} from './movement-response.type';
import type {ScheduledOccurrenceResponse} from './scheduled-occurrence-response.type';
import type {ScheduledTransactionResponse} from './scheduled-transaction-response.type';

/** Canceled occurrence result; the row is balance-neutral so no balance updates are returned (10.7/US-605). */
export interface CancelScheduledOccurrenceResponse {
  occurrence: ScheduledOccurrenceResponse;
  movement: MovementResponse;
  schedule: ScheduledTransactionResponse;
}
