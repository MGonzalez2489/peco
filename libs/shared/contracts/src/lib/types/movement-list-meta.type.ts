import type {MovementTotals} from './movement-totals.type';

/** Transport metadata for the movement list (D65/D101). */
export interface MovementListMeta {
  nextCursor: string | null;
  totals: MovementTotals;
}
