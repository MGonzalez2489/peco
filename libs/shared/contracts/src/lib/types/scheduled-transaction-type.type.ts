import type {ScheduledTransactionTypeEnum, StringEnumValues} from '@peco/enums';

/** Movement type a scheduled transaction will produce. */
export type ScheduledTransactionType = StringEnumValues<typeof ScheduledTransactionTypeEnum>;
