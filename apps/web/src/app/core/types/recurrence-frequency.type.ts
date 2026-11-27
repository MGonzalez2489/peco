import type {RecurrenceFrequencyEnum, StringEnumValues} from '@peco/enums';

/** Recurrence grid derived from the shared enum registry. */
export type RecurrenceFrequency = StringEnumValues<typeof RecurrenceFrequencyEnum>;
