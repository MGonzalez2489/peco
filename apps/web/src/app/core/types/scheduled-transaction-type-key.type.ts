import type {ScheduledTransactionTypeEnum, StringEnumValues} from '@peco/enums';

/** Wire key of a scheduled transaction type derived from the shared enum registry. */
export type ScheduledTransactionTypeKey = StringEnumValues<typeof ScheduledTransactionTypeEnum>;
