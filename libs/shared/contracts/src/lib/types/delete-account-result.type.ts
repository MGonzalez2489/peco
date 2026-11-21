import type {AccountBalanceUpdate} from './account-balance-update.type';
import type {MovementResponse} from './movement-response.type';

/** Payload of `DELETE /accounts/:publicId` (8.8/US-305). */
export interface DeleteAccountResult {
  deletedAccountPublicId: string;
  transferMovement: MovementResponse | null;
  balances: AccountBalanceUpdate[];
}
