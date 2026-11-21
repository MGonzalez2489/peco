import type {AccountType} from './account-type.type';
import type {MovementType} from './movement-type.type';

/** Accepted query for `GET /movements`; the API owns all defaults (8.10/D101). */
export interface ListMovementsQuery {
  period?: string;
  from?: string;
  to?: string;
  type?: MovementType;
  accountPublicId?: string;
  categoryPublicId?: string;
  accountType?: AccountType;
  note?: string;
  excludeReversals?: boolean;
  includeCanceled?: boolean;
  cursor?: string;
  limit: number;
}
