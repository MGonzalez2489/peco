import {AccountType} from '../models/account-type.model';
import {AccountTypeKey} from '../types/account-type-key.enum';
import {ACCOUNT_TYPES} from './account-types.constant';

export const ACCOUNT_TYPE_MAP = Object.fromEntries(
  ACCOUNT_TYPES.map((type) => [type.key, type]),
) as Record<AccountTypeKey, AccountType>;
