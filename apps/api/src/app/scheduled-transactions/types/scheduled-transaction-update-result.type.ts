import type {MovementWriteStatusEnum, StringEnumValue} from '@peco/enums';
import type {ScheduledTransactionEntity} from '../../database/entities';

/** Outcome of an optimistic schedule edit before HTTP error mapping (10.8/US-602). */
export type ScheduledTransactionUpdateResult =
  | {
      status: StringEnumValue<typeof MovementWriteStatusEnum.UPDATED>;
      schedule: ScheduledTransactionEntity;
    }
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.NOT_FOUND>}
  | {
      status: StringEnumValue<typeof MovementWriteStatusEnum.CONFLICT>;
      currentVersion: number;
    };
