import {ACCOUNT_TYPE_MAP} from '../constants/account-type-map.constant';
import {Account} from '../models/account.model';

/** Resolves the palette name for an account, honoring its color override. */
export function resolveAccountColor(account: Account): string {
  return account.color ?? ACCOUNT_TYPE_MAP[account.type]?.color ?? 'indigo';
}
