import type {MovementProgressionPoint} from './movement-progression-point.type';
import type {MovementProgressionTotals} from './movement-progression-totals.type';

/** Owner-scoped monthly movement progression returned by `GET /reports/movements/progression` (8.13). */
export interface MovementProgressionResponse {
  period: string;
  points: MovementProgressionPoint[];
  totals: MovementProgressionTotals;
}
