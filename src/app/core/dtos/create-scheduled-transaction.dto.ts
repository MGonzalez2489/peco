import {ScheduledTransaction} from '../models/scheduled-transaction.model';

export type CreateScheduledTransactionDto = Omit<
  ScheduledTransaction,
  'id' | 'completedOccurrences' | 'createdAt' | 'updatedAt'
>;
