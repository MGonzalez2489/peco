import {stringEnumValue} from './string-enum-value';

/** Stable `auditLogs.entity` labels shared by every domain (7.3, D83). */
export const AuditEntityEnum = {
  ACCOUNTS: stringEnumValue('accounts'),
  MOVEMENTS: stringEnumValue('movements'),
  USERS: stringEnumValue('users'),
} as const;
