import {Account} from '../models/account.model';
import {isLiability} from './is-liability.util';

/**
 * Money the user can actually spend: balances of non-liability accounts that
 * are included in the available total. Credit cards are liabilities, so their
 * debt never reduces this figure; it is reported separately through
 * `calculateTotalLiabilities`.
 */
export function calculateNetLiquidBalance(accounts: Account[]): number {
  return accounts
    .filter((account) => account.includeInTotal !== false && !isLiability(account.type))
    .reduce((total, account) => total + account.currentBalance, 0);
}
