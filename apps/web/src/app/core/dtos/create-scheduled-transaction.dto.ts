import {ScheduledTransaction} from '../models/scheduled-transaction.model';

/**
 * `estimatedAmount` is expressed in integer cents, like the model it derives
 * from.
 */
export type CreateScheduledTransactionDto = Omit<
  ScheduledTransaction,
  'id' | 'completedOccurrences' | 'createdAt' | 'updatedAt'
>;
