import {IconName} from '@shared/components/app-icon/app-icon.component';
import {ACCOUNT_TYPE_MAP} from '../constants/account-type-map.constant';
import {Account} from '../models/account.model';
import {toIconName} from './to-icon-name.util';

/** Resolves the icon for an account, honoring its icon override. */
export function resolveAccountIcon(account: Account): IconName {
  return toIconName(account.icon, ACCOUNT_TYPE_MAP[account.type]?.icon ?? 'wallet');
}
