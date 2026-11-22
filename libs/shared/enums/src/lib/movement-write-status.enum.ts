import {stringEnumValue} from './string-enum-value';

/** Outcome of a ledger write (US-501). */
export const MovementWriteStatusEnum = {
  CREATED: stringEnumValue('created'),
  UPDATED: stringEnumValue('updated'),
  NOT_FOUND: stringEnumValue('not-found'),
  SELF_TRANSFER: stringEnumValue('self-transfer'),
  TRANSFER_REQUIRED: stringEnumValue('transfer-required'),
  CATEGORY_NOT_COMPATIBLE: stringEnumValue('category-not-compatible'),
  NEGATIVE_BALANCE: stringEnumValue('negative-balance'),
  PERIOD_CLOSED: stringEnumValue('period-closed'),
  LOCKED: stringEnumValue('locked'),
  CONFLICT: stringEnumValue('conflict'),
} as const;
