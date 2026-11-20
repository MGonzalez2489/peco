import type {AccountEntity} from '../../database/entities';

/** Outcome of an owner-scoped optimistic account update (US-303). */
export type AccountUpdateResult =
  | {status: 'updated'; account: AccountEntity}
  | {status: 'not-found'}
  | {status: 'conflict'; currentVersion: number};
