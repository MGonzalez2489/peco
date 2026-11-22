import type {AccountBalanceUpdate} from '@peco/contracts';
import type {MovementWriteStatusEnum, StringEnumValue} from '@peco/enums';

/** Outcome of a serialized movement soft delete with its refreshed account cards (US-506). */
export type MovementDeleteResult =
  | {
      status: StringEnumValue<typeof MovementWriteStatusEnum.DELETED>;
      deletedPublicId: string;
      balances: AccountBalanceUpdate[];
    }
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.NOT_FOUND>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.LOCKED>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.NEGATIVE_BALANCE>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.PERIOD_CLOSED>};
