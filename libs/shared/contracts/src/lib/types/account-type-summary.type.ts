import type {AccountType} from './account-type.type';

/** Count and signed total for one account type (8.8). */
export interface AccountTypeSummary {
  type: AccountType;
  count: number;
  total: number;
}
