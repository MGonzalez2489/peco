import {AccountTypeKey} from '../types/account-type-key.enum';

export function isLiability(type: AccountTypeKey): boolean {
  return type === AccountTypeKey.CREDIT;
}
