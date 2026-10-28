import {AccountTypeFilter} from '../types/account-type-filter.type';
import {MovementFilterType} from '../types/movement-filter-type.type';

export interface MovementFilters {
  type: MovementFilterType;
  accountId: string;
  categoryId: string;
  accountType: AccountTypeFilter;
  /** Case-insensitive "contains" query matched against the movement note. */
  note: string;
}
