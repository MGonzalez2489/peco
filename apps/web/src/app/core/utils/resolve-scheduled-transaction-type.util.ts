import {SCHEDULED_TRANSACTION_TYPE_MAP} from '../constants/scheduled-transaction-type-map.constant';
import {ScheduledTransactionType} from '../models/scheduled-transaction-type.model';
import {ScheduledTransactionTypeEnum} from '@peco/enums';
import type {ScheduledTransactionTypeKey} from '../types/scheduled-transaction-type-key.type';

const FALLBACK = SCHEDULED_TRANSACTION_TYPE_MAP[ScheduledTransactionTypeEnum.EXPENSE.toString()];

export const resolveScheduledTransactionType = (value: unknown): ScheduledTransactionType => {
  if (value && typeof value === 'object') return value as ScheduledTransactionType;

  const key = value as ScheduledTransactionTypeKey;
  return SCHEDULED_TRANSACTION_TYPE_MAP[key] ?? FALLBACK;
};
