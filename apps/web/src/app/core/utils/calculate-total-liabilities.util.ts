import {Account} from '../models/account.model';
import {getOutstandingDebt} from './get-outstanding-debt.util';

/** Total debt of every liability account included in the available total. */
export function calculateTotalLiabilities(accounts: Account[]): number {
  return accounts
    .filter((account) => account.includeInTotal !== false)
    .reduce((total, account) => total + getOutstandingDebt(account), 0);
}
