import type {ApplyDueResult} from './apply-due-result.type';
import type {ScheduledTransactionResponse} from './scheduled-transaction-response.type';

/** Per-occurrence summary plus domain counters for `POST /apply-due` (D65/D53/D58). */
export interface ApplyDueResponse {
  asOf: string;
  results: ApplyDueResult[];
  schedules: ScheduledTransactionResponse[];
  applied: number;
  skipped: number;
  failed: number;
  skippedWhileInactive: number;
}
