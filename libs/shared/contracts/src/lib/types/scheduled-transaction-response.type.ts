import type {RecurrenceFrequency} from './recurrence-frequency.type';
import type {ScheduledAccountSummary} from './scheduled-account-summary.type';
import type {ScheduledCategorySummary} from './scheduled-category-summary.type';
import type {ScheduledTransactionType} from './scheduled-transaction-type.type';

/** Public schedule shape; internal ids never leave the API (8.11). */
export interface ScheduledTransactionResponse {
  publicId: string;
  name: string;
  estimatedAmount: number;
  type: ScheduledTransactionType;
  category: ScheduledCategorySummary;
  sourceAccount: ScheduledAccountSummary;
  destinationAccount: ScheduledAccountSummary | null;
  frequency: RecurrenceFrequency;
  interval: number;
  anchorDate: string;
  nextContemplatedDate: string;
  nextExecutionDate: string;
  autoApply: boolean;
  active: boolean;
  totalOccurrences: number | null;
  completedOccurrences: number;
  endDate: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}
