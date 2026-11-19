import type {UserEntity} from '../../database/entities';

/** Result of a rotation attempt; failures are committed before the service throws. */
export type RefreshRotationOutcome =
  | {status: 'rotated'; user: UserEntity}
  | {status: 'expired'}
  | {status: 'reused'}
  | {status: 'invalid'};
