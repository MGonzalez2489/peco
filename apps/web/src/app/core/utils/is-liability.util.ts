import {AccountType} from '../types/account-type.type';

export function isLiability(type: AccountType): boolean {
  return type === 'CREDIT';
}
