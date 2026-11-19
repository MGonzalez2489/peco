import {stringEnumValue} from './string-enum-value';

/** Movement types a category accepts. */
export const CategoryApplyTypeEnum = {
  INCOME: stringEnumValue('INCOME'),
  EXPENSE: stringEnumValue('EXPENSE'),
  BOTH: stringEnumValue('BOTH'),
  TRANSFER: stringEnumValue('TRANSFER'),
} as const;
