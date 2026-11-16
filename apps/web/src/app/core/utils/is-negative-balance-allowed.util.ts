import {AccountType} from '../types/account-type.type';

/**
 * Only credit cards may hold a negative balance (an outstanding debt). Every
 * other account type must keep a balance greater than or equal to zero.
 */
export const isNegativeBalanceAllowed = (type: AccountType): boolean => type === 'CREDIT';
