import type {AccountBalanceUpdate} from './account-balance-update.type';
import type {MovementResponse} from './movement-response.type';

/** Edited ledger row plus the refreshed account cards (8.10/US-504). */
export interface UpdateMovementResponse {
  movement: MovementResponse;
  balances: AccountBalanceUpdate[];
}
