import type {ApiErrorCodeEnum, StringEnumValue} from '@peco/enums';
import type {AccountPeriodBalanceEntity, PeriodSnapshotEntity} from '../../database/entities';

/** Outcome of one serialized close attempt (8.12/11.4). */
export type PeriodCloseResult =
  | {
      created: boolean;
      snapshot: PeriodSnapshotEntity;
      balances: AccountPeriodBalanceEntity[];
    }
  | {status: StringEnumValue<typeof ApiErrorCodeEnum.NOT_FOUND>}
  | {status: StringEnumValue<typeof ApiErrorCodeEnum.PERIOD_NOT_CLOSABLE>}
  | {status: StringEnumValue<typeof ApiErrorCodeEnum.PERIOD_BEFORE_ACTIVITY>};
