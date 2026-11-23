import {stringEnumValue} from './string-enum-value';

/** Stable `auditLogs.action` values shared by every domain (7.3, D50, D83). */
export const AuditActionEnum = {
  DELETE: stringEnumValue('DELETE'),
  EDIT: stringEnumValue('EDIT'),
  REPLACE: stringEnumValue('REPLACE'),
  REVERSAL: stringEnumValue('REVERSAL'),
  RECONCILE_MISMATCH: stringEnumValue('RECONCILE_MISMATCH'),
} as const;
