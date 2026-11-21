import type {AccountBalanceUpdate} from '@peco/contracts';
import type {MovementWriteStatusEnum, StringEnumValue} from '@peco/enums';
import type {AccountEntity, CategoryEntity, MovementEntity} from '../../database/entities';

/** Outcome of a serialized ledger insert with its refreshed account cards (US-501). */
export type MovementCreationResult =
  | {
      status: StringEnumValue<typeof MovementWriteStatusEnum.CREATED>;
      movement: MovementEntity;
      account: AccountEntity;
      targetAccount: AccountEntity | null;
      category: CategoryEntity;
      balances: AccountBalanceUpdate[];
    }
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.NOT_FOUND>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.SELF_TRANSFER>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.TRANSFER_REQUIRED>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.CATEGORY_NOT_COMPATIBLE>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.NEGATIVE_BALANCE>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.PERIOD_CLOSED>};
