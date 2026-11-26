import {stringEnumValue} from './string-enum-value';

/** Terminal states recorded for one scheduled job run (US-1002). */
export const JobStatusEnum = {
  SUCCESS: stringEnumValue('SUCCESS'),
  SKIPPED: stringEnumValue('SKIPPED'),
  FAILED: stringEnumValue('FAILED'),
} as const;
