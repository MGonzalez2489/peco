import type {AccountBalanceUpdate} from './account-balance-update.type';
import type {MovementResponse} from './movement-response.type';

/** New ledger row plus the refreshed account cards the client can update immediately (8.10/US-501). */
export interface CreateMovementResponse {
  movement: MovementResponse;
  balances: AccountBalanceUpdate[];
}
