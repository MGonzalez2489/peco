import {stringEnumValue} from './string-enum-value';

/** Recurrence grid used by scheduled transactions. */
export const RecurrenceFrequencyEnum = {
  DAILY: stringEnumValue('DAILY'),
  WEEKLY: stringEnumValue('WEEKLY'),
  FORTNIGHTLY: stringEnumValue('FORTNIGHTLY'),
  MONTHLY: stringEnumValue('MONTHLY'),
  YEARLY: stringEnumValue('YEARLY'),
} as const;
