import type {AccountBalanceUpdate} from './account-balance-update.type';
import type {MovementResponse} from './movement-response.type';
import type {ScheduledOccurrenceResponse} from './scheduled-occurrence-response.type';
import type {ScheduledTransactionResponse} from './scheduled-transaction-response.type';

/** Result of applying one occurrence; `movement` is null for a skipped closed period (8.11/US-604). */
export interface ExecuteScheduledTransactionResponse {
  occurrence: ScheduledOccurrenceResponse;
  movement: MovementResponse | null;
  schedule: ScheduledTransactionResponse;
  balances: AccountBalanceUpdate[];
}
