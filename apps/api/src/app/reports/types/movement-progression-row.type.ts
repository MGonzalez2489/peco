import type {MovementEntity} from '../../database/entities';

/** Ledger fields needed to build one month of movement progression (US-803/D41). */
export type MovementProgressionRow = Pick<
  MovementEntity,
  'id' | 'date' | 'type' | 'amount' | 'isCanceled' | 'isReversal' | 'isReversed'
>;
