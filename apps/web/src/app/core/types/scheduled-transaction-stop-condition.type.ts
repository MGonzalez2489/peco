import type {ScheduledTransactionStopConditionEnum, StringEnumValues} from '@peco/enums';

/** Stop condition derived from the shared enum registry. */
export type ScheduledTransactionStopCondition = StringEnumValues<
  typeof ScheduledTransactionStopConditionEnum
>;
