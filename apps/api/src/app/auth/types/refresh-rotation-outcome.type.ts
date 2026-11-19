import type {RefreshRotationStatusEnum, StringEnumValue} from '@peco/enums';
import type {UserEntity} from '../../database/entities';

/** Result of a rotation attempt; failures are committed before the service throws. */
export type RefreshRotationOutcome =
  | {status: StringEnumValue<typeof RefreshRotationStatusEnum.ROTATED>; user: UserEntity}
  | {status: StringEnumValue<typeof RefreshRotationStatusEnum.EXPIRED>}
  | {status: StringEnumValue<typeof RefreshRotationStatusEnum.REUSED>}
  | {status: StringEnumValue<typeof RefreshRotationStatusEnum.INVALID>};
