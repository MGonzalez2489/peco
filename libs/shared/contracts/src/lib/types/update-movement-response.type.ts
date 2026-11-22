import type {AccountBalanceUpdate} from './account-balance-update.type';
import type {MovementResponse} from './movement-response.type';

/** Edited ledger row plus refreshed cards; a type change adds the retired public id (8.10/US-505). */
export interface UpdateMovementResponse {
  movement: MovementResponse;
  balances: AccountBalanceUpdate[];
  replacedPublicId?: string;
}
