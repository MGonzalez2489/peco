import {AccountTypeDefinition} from '../models/account-type-definition.model';
import {AccountType} from '../types/account-type.type';
import {ACCOUNT_TYPES} from './account-types.constant';

export const ACCOUNT_TYPE_MAP = Object.fromEntries(
  ACCOUNT_TYPES.map((type) => [type.key, type]),
) as Record<AccountType, AccountTypeDefinition>;
