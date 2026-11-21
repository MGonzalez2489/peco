import type {AccountWriteStatusEnum, StringEnumValue} from '@peco/enums';
import type {AccountEntity, CategoryEntity, MovementEntity} from '../../database/entities';

/** Outcome of an owner-scoped account deletion with an optional balance transfer (US-305). */
export type AccountDeletionResult =
  | {
      status: StringEnumValue<typeof AccountWriteStatusEnum.DELETED>;
      source: AccountEntity;
      destination: AccountEntity | null;
      movement: MovementEntity | null;
      movementAccount: AccountEntity | null;
      targetAccount: AccountEntity | null;
      category: CategoryEntity | null;
    }
  | {status: StringEnumValue<typeof AccountWriteStatusEnum.NOT_FOUND>}
  | {status: StringEnumValue<typeof AccountWriteStatusEnum.ROOT_PROTECTED>}
  | {status: StringEnumValue<typeof AccountWriteStatusEnum.SELF_TRANSFER>}
  | {status: StringEnumValue<typeof AccountWriteStatusEnum.TRANSFER_REQUIRED>}
  | {status: StringEnumValue<typeof AccountWriteStatusEnum.NEGATIVE_BALANCE>}
  | {status: StringEnumValue<typeof AccountWriteStatusEnum.PERIOD_CLOSED>};
