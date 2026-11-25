import type {RecurrenceFrequency, ScheduledTransactionType} from '@peco/contracts';

/** Active schedule fields needed to enumerate its unprocessed occurrences (US-805). */
export interface ScheduledCommitmentSchedule {
  id: number;
  estimatedAmount: number;
  type: ScheduledTransactionType;
  categoryId: number;
  anchorDate: string;
  frequency: RecurrenceFrequency;
  interval: number;
  nextContemplatedDate: string;
  nextExecutionDate: string;
  endDate: string | null;
  totalOccurrences: number | null;
  completedOccurrences: number;
}
