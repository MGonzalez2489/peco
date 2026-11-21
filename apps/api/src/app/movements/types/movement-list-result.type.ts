import type {MovementTotals} from '@peco/contracts';
import type {MovementEntity} from '../../database/entities';

/** One page of loaded movements, its successor cursor and the whole-filter totals. */
export interface MovementListResult {
  items: MovementEntity[];
  nextCursor: string | null;
  totals: MovementTotals;
}
