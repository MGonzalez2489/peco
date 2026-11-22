import type {AccountBalanceUpdate} from './account-balance-update.type';
import type {MovementResponse} from './movement-response.type';

/** Payload of `POST /movements/:publicId/revert` (8.10/US-507). */
export interface RevertMovementResponse {
  original: MovementResponse;
  reversal: MovementResponse;
  balances: AccountBalanceUpdate[];
}
