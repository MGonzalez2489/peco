import {stringEnumValue} from './string-enum-value';

/** Kind of account. Only `CREDIT` may hold a negative balance. */
export const AccountTypeEnum = {
  CASH: stringEnumValue('CASH'),
  DEBIT: stringEnumValue('DEBIT'),
  CREDIT: stringEnumValue('CREDIT'),
  SAVINGS: stringEnumValue('SAVINGS'),
} as const;
