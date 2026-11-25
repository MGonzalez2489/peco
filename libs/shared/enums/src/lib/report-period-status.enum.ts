import {stringEnumValue} from './string-enum-value';

/** Temporal state of a report period relative to the current UTC month (8.13). */
export const ReportPeriodStatusEnum = {
  CLOSED: stringEnumValue('CLOSED'),
  CURRENT: stringEnumValue('CURRENT'),
  FUTURE: stringEnumValue('FUTURE'),
} as const;
