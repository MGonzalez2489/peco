import {IconName} from '@shared/components/app-icon/app-icon.component';
import {AccountType} from '../types/account-type.type';

export interface AccountTypeSummary {
  type: AccountType;
  label: string;
  count: number;
  total: number;
  color: string;
  icon: IconName;
}
