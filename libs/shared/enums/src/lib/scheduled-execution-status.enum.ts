import {stringEnumValue} from './string-enum-value';

/** Terminal or retryable state of one scheduled occurrence. */
export const ScheduledExecutionStatusEnum = {
  APPLIED: stringEnumValue('APPLIED'),
  SKIPPED: stringEnumValue('SKIPPED'),
  FAILED: stringEnumValue('FAILED'),
} as const;
