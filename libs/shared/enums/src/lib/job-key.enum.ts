import {stringEnumValue} from './string-enum-value';

/** Single-flight keys for the in-process scheduled jobs (12/US-1001). */
export const JobKeyEnum = {
  AUTO_APPLY: stringEnumValue('AUTO_APPLY'),
  PERIOD_CLOSE: stringEnumValue('PERIOD_CLOSE'),
  RECONCILIATION: stringEnumValue('RECONCILIATION'),
  CLEANUP: stringEnumValue('CLEANUP'),
} as const;
