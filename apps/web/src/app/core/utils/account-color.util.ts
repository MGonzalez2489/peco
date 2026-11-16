import {ACCOUNT_COLORS} from '../constants/account-colors.constant';
import {AccountColor} from '../types/account-color.type';

export function accountColor(color?: string): {
  text: string;
  textDark: string;
  chip: string;
  bar: string;
} {
  if (color && color.startsWith('#')) {
    return {text: color, textDark: color, chip: color, bar: color};
  }

  return ACCOUNT_COLORS[(color ?? 'indigo') as AccountColor] ?? ACCOUNT_COLORS.indigo;
}
