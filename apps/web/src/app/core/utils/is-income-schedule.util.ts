import {ScheduledTransactionTypeKey} from '../types/scheduled-transaction-type-key.enum';

export const isIncomeSchedule = (type: ScheduledTransactionTypeKey): boolean =>
  type === ScheduledTransactionTypeKey.INCOME;
