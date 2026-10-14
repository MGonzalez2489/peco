import {ScheduledTransactionType} from '../models/scheduled-transaction-type.model';
import {ScheduledTransactionTypeKey} from '../types/scheduled-transaction-type-key.enum';
import {SCHEDULED_TRANSACTION_TYPES} from './scheduled-transaction-types.constant';

export const SCHEDULED_TRANSACTION_TYPE_MAP = Object.fromEntries(
  SCHEDULED_TRANSACTION_TYPES.map((type) => [type.key, type]),
) as Record<ScheduledTransactionTypeKey, ScheduledTransactionType>;
