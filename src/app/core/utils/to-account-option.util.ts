import {Account} from '../models/account.model';
import {SelectOption} from '../models/select-option.model';
import {accountColor} from './account-color.util';
import {resolveAccountColor} from './resolve-account-color.util';
import {resolveAccountIcon} from './resolve-account-icon.util';

export const toAccountOption = (account: Account): SelectOption => ({
  value: account.id,
  label: account.name,
  icon: resolveAccountIcon(account),
  color: accountColor(resolveAccountColor(account)).chip,
});
