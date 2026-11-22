import type {AccountBalanceUpdate} from '@peco/contracts';
import type {MovementWriteStatusEnum, StringEnumValue} from '@peco/enums';
import type {MovementEntity} from '../../database/entities';

/** Outcome of a serialized reversal with both fully hydrated ledger rows (US-507). */
export type MovementRevertResult =
  | {
      status: StringEnumValue<typeof MovementWriteStatusEnum.REVERTED>;
      original: MovementEntity;
      reversal: MovementEntity;
      balances: AccountBalanceUpdate[];
    }
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.NOT_FOUND>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.LOCKED>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.NEGATIVE_BALANCE>}
  | {status: StringEnumValue<typeof MovementWriteStatusEnum.PERIOD_CLOSED>};
