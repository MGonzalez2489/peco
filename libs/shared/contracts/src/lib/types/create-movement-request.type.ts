import type {MovementType} from './movement-type.type';

/** Ledger creation body; amounts are integer cents and timestamps are UTC ISO strings (8.10/US-501). */
export interface CreateMovementRequest {
  type: MovementType;
  amount: number;
  date?: string;
  note?: string | null;
  accountPublicId: string;
  categoryPublicId?: string;
  targetAccountPublicId?: string;
}
