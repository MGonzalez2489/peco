import {RecurrenceFrequency} from '../types/recurrence-frequency.type';
import {ScheduledTransactionType} from '../types/scheduled-transaction-type.type';

export interface ScheduledTransaction {
  id: string;
  name: string;
  estimatedAmount: number;
  type: ScheduledTransactionType;
  categoryId: string;
  sourceAccountId: string;
  destinationAccountId?: string;

  frequency: RecurrenceFrequency;
  nextExecutionDate: string;
  autoApply: boolean;

  active: boolean;
  totalOccurrences?: number;
  completedOccurrences: number;
  endDate?: string;

  createdAt: string;
  updatedAt: string;
}
