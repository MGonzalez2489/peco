import type {ScheduledTransactionEntity} from '../../database/entities';

/** Recomputed schedule row applied by the optimistic update (10.8/US-602). */
export interface ScheduledTransactionUpdateValues {
  name: string;
  estimatedAmount: number;
  type: ScheduledTransactionEntity['type'];
  categoryId: number;
  sourceAccountId: number;
  destinationAccountId: number | null;
  frequency: ScheduledTransactionEntity['frequency'];
  interval: number;
  anchorDate: string;
  nextContemplatedDate: string;
  nextExecutionDate: string;
  autoApply: boolean;
  active: boolean;
  totalOccurrences: number | null;
  endDate: string | null;
}
