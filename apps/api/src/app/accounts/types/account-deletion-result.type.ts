import type {AccountEntity, CategoryEntity, MovementEntity} from '../../database/entities';

/** Outcome of an owner-scoped account deletion with an optional balance transfer (US-305). */
export type AccountDeletionResult =
  | {
      status: 'deleted';
      source: AccountEntity;
      destination: AccountEntity | null;
      movement: MovementEntity | null;
      movementAccount: AccountEntity | null;
      targetAccount: AccountEntity | null;
      category: CategoryEntity | null;
    }
  | {status: 'not-found'}
  | {status: 'root-protected'}
  | {status: 'self-transfer'}
  | {status: 'transfer-required'}
  | {status: 'negative-balance'}
  | {status: 'period-closed'};
