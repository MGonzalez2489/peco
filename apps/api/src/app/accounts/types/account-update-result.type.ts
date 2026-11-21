import type {AccountWriteStatusEnum, StringEnumValue} from '@peco/enums';
import type {AccountEntity} from '../../database/entities';

/** Outcome of an owner-scoped optimistic account update (US-303). */
export type AccountUpdateResult =
  | {
      status: StringEnumValue<typeof AccountWriteStatusEnum.UPDATED>;
      account: AccountEntity;
    }
  | {status: StringEnumValue<typeof AccountWriteStatusEnum.NOT_FOUND>}
  | {
      status: StringEnumValue<typeof AccountWriteStatusEnum.CONFLICT>;
      currentVersion: number;
    };
