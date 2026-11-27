import {stringEnumValue} from './string-enum-value';

/** How a scheduled transaction stops generating occurrences. */
export const ScheduledTransactionStopConditionEnum = {
  NEVER: stringEnumValue('NEVER'),
  OCCURRENCES: stringEnumValue('OCCURRENCES'),
  DATE: stringEnumValue('DATE'),
} as const;
