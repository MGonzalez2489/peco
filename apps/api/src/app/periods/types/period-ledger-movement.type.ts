import type {MovementEntity} from '../../database/entities';

/** Ledger fields needed to project one movement into a monthly snapshot (9.2). */
export type PeriodLedgerMovement = Pick<
  MovementEntity,
  'id' | 'date' | 'type' | 'amount' | 'accountId' | 'targetAccountId' | 'isCanceled'
>;
