import type {AccountBalanceUpdate, ApiErrorCode} from '@peco/contracts';
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

/** Outcome of an atomic single-occurrence execution (10.5/US-604). */
export type ScheduledExecutionResult =
  | {
      status: StringEnumValue<typeof ScheduledExecutionStatusEnum.APPLIED>;
      replayed: boolean;
      occurrence: ScheduledExecutionEntity;
      movement: MovementEntity;
      balances: AccountBalanceUpdate[];
      schedule: ScheduledTransactionEntity;
    }
  | {
      status: StringEnumValue<typeof ScheduledExecutionStatusEnum.SKIPPED>;
      replayed: boolean;
      occurrence: ScheduledExecutionEntity;
      balances: AccountBalanceUpdate[];
      schedule: ScheduledTransactionEntity;
    }
  | {
      status: StringEnumValue<typeof ScheduledExecutionStatusEnum.FAILED>;
      occurrence: ScheduledExecutionEntity;
      reason: ApiErrorCode;
      schedule: ScheduledTransactionEntity;
    }
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.NOT_FOUND>}
  | {
      status: StringEnumValue<typeof ApiErrorCodeEnum.SCHEDULE_INACTIVE>;
      schedule: ScheduledTransactionEntity;
    }
  | {
      status: StringEnumValue<typeof ApiErrorCodeEnum.SCHEDULE_NOT_DUE>;
      schedule: ScheduledTransactionEntity;
    };
