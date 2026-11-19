import type {RecurrenceFrequencyEnum, StringEnumValues} from '@peco/enums';

/** Recurrence grid used by scheduled transactions. */
export type RecurrenceFrequency = StringEnumValues<typeof RecurrenceFrequencyEnum>;
