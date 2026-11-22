import type {AccountBalanceUpdate} from './account-balance-update.type';

/** Payload of `DELETE /movements/:publicId` (8.10/US-506). */
export interface DeleteMovementResult {
  deletedPublicId: string;
  balances: AccountBalanceUpdate[];
}
