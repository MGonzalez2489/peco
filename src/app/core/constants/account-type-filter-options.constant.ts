import {SelectOption} from '../models/select-option.model';
import {toAccountTypeOption} from '../utils/to-account-type-option.util';
import {ACCOUNT_TYPES} from './account-types.constant';

/** Account type filter options; the `ALL` entry clears the filter. */
export const ACCOUNT_TYPE_FILTER_OPTIONS: readonly SelectOption[] = [
  {value: 'ALL', label: 'Todos los tipos'},
  ...ACCOUNT_TYPES.map(toAccountTypeOption),
];
