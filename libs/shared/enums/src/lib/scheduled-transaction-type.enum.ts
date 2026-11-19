import {stringEnumValue} from './string-enum-value';

/** Movement type a scheduled transaction will produce. */
export const ScheduledTransactionTypeEnum = {
  INCOME: stringEnumValue('INCOME'),
  EXPENSE: stringEnumValue('EXPENSE'),
  TRANSFER: stringEnumValue('TRANSFER'),
} as const;
