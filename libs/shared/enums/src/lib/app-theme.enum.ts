import {stringEnumValue} from './string-enum-value';

/** User-selectable theme. */
export const AppThemeEnum = {
  LIGHT: stringEnumValue('light'),
  DARK: stringEnumValue('dark'),
  SYSTEM: stringEnumValue('system'),
} as const;
