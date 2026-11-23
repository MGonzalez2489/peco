import type {MovementWriteStatusEnum, StringEnumValue} from '@peco/enums';
import type {
  AccountEntity,
  CategoryEntity,
  ScheduledTransactionEntity,
} from '../../database/entities';

/** Outcome of an owner-scoped schedule insert before HTTP error mapping. */
export type ScheduledTransactionCreationResult =
  | {
      status: StringEnumValue<typeof MovementWriteStatusEnum.CREATED>;
      schedule: ScheduledTransactionEntity;
      category: CategoryEntity;
      sourceAccount: AccountEntity;
      destinationAccount: AccountEntity | null;
    }
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.NOT_FOUND>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.SELF_TRANSFER>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.TRANSFER_REQUIRED>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.CATEGORY_NOT_COMPATIBLE>};
