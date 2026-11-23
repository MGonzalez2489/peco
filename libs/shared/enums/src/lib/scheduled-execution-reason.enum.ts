import {stringEnumValue} from './string-enum-value';

/** Reasons recorded on non-successful scheduled executions (US-604/US-605). */
export const ScheduledExecutionReasonEnum = {
  PERIOD_CLOSED: stringEnumValue('PERIOD_CLOSED'),
  USER_CANCELLED: stringEnumValue('USER_CANCELLED'),
} as const;
