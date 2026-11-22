import type {AccountBalanceUpdate} from '@peco/contracts';
import type {MovementWriteStatusEnum, StringEnumValue} from '@peco/enums';
import type {AccountEntity, CategoryEntity, MovementEntity} from '../../database/entities';

/** Outcome of a serialized ledger write with its refreshed account cards (US-504/US-505). */
export type MovementUpdateResult =
  | {
      status: StringEnumValue<typeof MovementWriteStatusEnum.UPDATED>;
      movement: MovementEntity;
      account: AccountEntity;
      targetAccount: AccountEntity | null;
      category: CategoryEntity;
      balances: AccountBalanceUpdate[];
    }
  | {
      status: StringEnumValue<typeof MovementWriteStatusEnum.REPLACED>;
      movement: MovementEntity;
      account: AccountEntity;
      targetAccount: AccountEntity | null;
      category: CategoryEntity;
      balances: AccountBalanceUpdate[];
      replacedPublicId: string;
    }
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.NOT_FOUND>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.SELF_TRANSFER>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.TRANSFER_REQUIRED>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.CATEGORY_NOT_COMPATIBLE>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.NEGATIVE_BALANCE>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.PERIOD_CLOSED>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.LOCKED>}
  | {
      status: StringEnumValue<typeof MovementWriteStatusEnum.CONFLICT>;
      expectedVersion: number;
      currentVersion: number;
    };
