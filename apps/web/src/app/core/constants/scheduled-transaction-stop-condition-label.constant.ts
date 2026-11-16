import {ScheduledTransactionStopCondition} from '../types/scheduled-transaction-stop-condition.type';

export const SCHEDULED_TRANSACTION_STOP_CONDITION_LABEL: Record<
  ScheduledTransactionStopCondition,
  string
> = {
  NEVER: 'Sin fin',
  OCCURRENCES: 'Por repeticiones',
  DATE: 'Por fecha límite',
};
