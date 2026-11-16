import {Account} from '../models/account.model';
import {isLiability} from './is-liability.util';

/**
 * Outstanding debt of a single liability account, expressed as a positive
 * number. Credit balances are stored as negative values, so the sign is
 * inverted here to keep debt reports intuitive.
 */
export function getOutstandingDebt(account: Account): number {
  if (!isLiability(account.type)) return 0;
  return Math.max(0, -account.currentBalance);
}
