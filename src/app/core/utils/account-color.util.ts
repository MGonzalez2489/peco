import {ACCOUNT_COLORS} from '../constants/account-colors.constant';
import {AccountColor} from '../types/account-color.type';

export function accountColor(color?: string): {text: string; chip: string; bar: string} {
  return ACCOUNT_COLORS[(color ?? 'indigo') as AccountColor] ?? ACCOUNT_COLORS.indigo;
}
