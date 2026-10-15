import {Account} from '../models/account.model';
import {SelectOption} from '../models/select-option.model';
import {accountColor} from './account-color.util';
import {toIconName} from './to-icon-name.util';

export const toAccountOption = (account: Account): SelectOption => ({
  value: account.id,
  label: account.name,
  icon: toIconName(account.type.icon, 'wallet'),
  color: accountColor(account.type.color).chip,
});
