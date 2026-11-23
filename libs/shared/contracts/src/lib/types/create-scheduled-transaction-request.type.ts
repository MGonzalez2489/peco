import type {RecurrenceFrequency} from './recurrence-frequency.type';
import type {ScheduledTransactionType} from './scheduled-transaction-type.type';

/** Schedule creation body; amounts are integer cents and dates are UTC `YYYY-MM-DD` (8.11/US-601). */
export interface CreateScheduledTransactionRequest {
  name: string;
  estimatedAmount: number;
  type: ScheduledTransactionType;
  categoryPublicId: string;
  sourceAccountPublicId: string;
  destinationAccountPublicId?: string | null;
  frequency: RecurrenceFrequency;
  interval?: number;
  anchorDate: string;
  autoApply?: boolean;
  totalOccurrences?: number | null;
  endDate?: string | null;
}
