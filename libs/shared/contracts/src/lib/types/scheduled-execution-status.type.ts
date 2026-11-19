import type {ScheduledExecutionStatusEnum, StringEnumValues} from '@peco/enums';

/** Terminal or retryable state of one scheduled occurrence. */
export type ScheduledExecutionStatus = StringEnumValues<typeof ScheduledExecutionStatusEnum>;
