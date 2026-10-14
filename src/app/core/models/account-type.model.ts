import {IconName} from '@shared/components/app-icon/app-icon.component';
import {AccountTypeKey} from '../types/account-type-key.enum';

export interface AccountType {
  key: AccountTypeKey;
  name: string;
  color: string;
  icon: IconName;
}
