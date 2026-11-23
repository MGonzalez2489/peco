import {stringEnumValue} from './string-enum-value';

/** Reasons recorded on skipped scheduled executions (US-604/US-605/US-606). */
export const ScheduledExecutionReasonEnum = {
  PERIOD_CLOSED: stringEnumValue('PERIOD_CLOSED'),
  USER_CANCELLED: stringEnumValue('USER_CANCELLED'),
  INACTIVE_USER: stringEnumValue('INACTIVE_USER'),
} as const;
