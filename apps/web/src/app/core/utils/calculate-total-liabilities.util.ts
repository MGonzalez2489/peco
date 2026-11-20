import {buildAccountSummary} from '@peco/utils';
import {Account} from '../models/account.model';

/** Total debt of every liability account included in the available total. */
export function calculateTotalLiabilities(accounts: Account[]): number {
  return buildAccountSummary(accounts).liabilitiesBalance;
}
