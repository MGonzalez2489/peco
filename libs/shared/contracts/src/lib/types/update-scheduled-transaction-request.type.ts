import type {RecurrenceFrequency} from './recurrence-frequency.type';
import type {ScheduledTransactionType} from './scheduled-transaction-type.type';

/** Partial schedule edit; server-owned next dates and counters are not accepted (8.11/10.8). */
export interface UpdateScheduledTransactionRequest {
  name?: string;
  estimatedAmount?: number;
  type?: ScheduledTransactionType;
  categoryPublicId?: string;
  sourceAccountPublicId?: string;
  destinationAccountPublicId?: string | null;
  frequency?: RecurrenceFrequency;
  interval?: number;
  anchorDate?: string;
  autoApply?: boolean;
  totalOccurrences?: number | null;
  endDate?: string | null;
  version?: number;
}
