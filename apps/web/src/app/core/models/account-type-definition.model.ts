import {IconName} from '@shared/components/app-icon/app-icon.component';
import {AccountType} from '../types/account-type.type';

export interface AccountTypeDefinition {
  key: AccountType;
  name: string;
  pluralName: string;
  color: string;
  icon: IconName;
}
