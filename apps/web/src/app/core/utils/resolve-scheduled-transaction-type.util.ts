import {SCHEDULED_TRANSACTION_TYPE_MAP} from '../constants/scheduled-transaction-type-map.constant';
import {ScheduledTransactionType} from '../models/scheduled-transaction-type.model';
import {ScheduledTransactionTypeKey} from '../types/scheduled-transaction-type-key.enum';

const FALLBACK = SCHEDULED_TRANSACTION_TYPE_MAP[ScheduledTransactionTypeKey.EXPENSE];

export const resolveScheduledTransactionType = (value: unknown): ScheduledTransactionType => {
  if (value && typeof value === 'object') return value as ScheduledTransactionType;

  const key = value as ScheduledTransactionTypeKey;
  return SCHEDULED_TRANSACTION_TYPE_MAP[key] ?? FALLBACK;
};
