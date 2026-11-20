import {buildAccountSummary} from '@peco/utils';
import {Account} from '../models/account.model';

/**
 * Money the user can actually spend: balances of non-liability accounts that
 * are included in the available total. Credit cards are liabilities, so their
 * debt never reduces this figure; it is reported separately through
 * `calculateTotalLiabilities`.
 */
export function calculateNetLiquidBalance(accounts: Account[]): number {
  return buildAccountSummary(accounts).availableBalance;
}
