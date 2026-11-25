import type {MovementEntity} from '../../database/entities';

/** Ledger fields needed to total one category distribution (US-804). */
export type CategoryDistributionRow = Pick<
  MovementEntity,
  'id' | 'categoryId' | 'type' | 'amount'
>;
