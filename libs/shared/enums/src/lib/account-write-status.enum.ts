import {stringEnumValue} from './string-enum-value';

/** Outcome of an owner-scoped account write (US-303–US-305). */
export const AccountWriteStatusEnum = {
  UPDATED: stringEnumValue('updated'),
  DELETED: stringEnumValue('deleted'),
  NOT_FOUND: stringEnumValue('not-found'),
  CONFLICT: stringEnumValue('conflict'),
  ROOT_PROTECTED: stringEnumValue('root-protected'),
  SELF_TRANSFER: stringEnumValue('self-transfer'),
  TRANSFER_REQUIRED: stringEnumValue('transfer-required'),
  NEGATIVE_BALANCE: stringEnumValue('negative-balance'),
  PERIOD_CLOSED: stringEnumValue('period-closed'),
} as const;
