import {isLiabilityAccount} from '@peco/utils';
import {AccountType} from '../types/account-type.type';

export function isLiability(type: AccountType): boolean {
  return isLiabilityAccount(type);
}
