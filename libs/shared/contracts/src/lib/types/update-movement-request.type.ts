import type {MovementType} from './movement-type.type';

/** Partial ledger edit; `date` is immutable and a `type` change belongs to US-505 (8.10/US-504). */
export interface UpdateMovementRequest {
  type?: MovementType;
  amount?: number;
  note?: string | null;
  accountPublicId?: string;
  categoryPublicId?: string;
  targetAccountPublicId?: string;
  version?: number;
  date?: never;
}
