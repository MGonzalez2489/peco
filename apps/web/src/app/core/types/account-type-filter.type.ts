import {AccountType} from './account-type.type';

/** Account type filter: `'ALL'` disables the filter, otherwise it matches a single type. */
export type AccountTypeFilter = 'ALL' | AccountType;
