import type {
  ApiErrorCodeEnum,
  MovementWriteStatusEnum,
  ScheduledExecutionStatusEnum,
  StringEnumValue,
} from '@peco/enums';
import type {
  MovementEntity,
  ScheduledExecutionEntity,
  ScheduledTransactionEntity,
} from '../../database/entities';

/** Outcome of an atomic occurrence cancellation (10.7/US-605). */
export type CancelScheduledOccurrenceResult =
  | {
      status: StringEnumValue<typeof ScheduledExecutionStatusEnum.SKIPPED>;
      occurrence: ScheduledExecutionEntity;
      movement: MovementEntity;
      schedule: ScheduledTransactionEntity;
    }
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.NOT_FOUND>}
  | {status: StringEnumValue<typeof ApiErrorCodeEnum.SCHEDULE_INACTIVE>}
  | {status: StringEnumValue<typeof ApiErrorCodeEnum.SCHEDULE_NOT_DUE>}
  | {status: StringEnumValue<typeof ApiErrorCodeEnum.OCCURRENCE_ALREADY_PROCESSED>}
  | {status: StringEnumValue<typeof ApiErrorCodeEnum.PERIOD_CLOSED>}
  | {status: StringEnumValue<typeof ApiErrorCodeEnum.UNPROCESSABLE_ENTITY>};
