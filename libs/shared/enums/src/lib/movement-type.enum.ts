import {stringEnumValue} from './string-enum-value';

/** Direction of a movement; the amount itself is always a positive magnitude. */
export const MovementTypeEnum = {
  INCOME: stringEnumValue('INCOME'),
  EXPENSE: stringEnumValue('EXPENSE'),
  TRANSFER: stringEnumValue('TRANSFER'),
} as const;
