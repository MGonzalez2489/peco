import {IconName} from '@shared/components/app-icon/app-icon.component';

export interface SelectOption {
  value: string;
  label: string;
  icon?: IconName;
  color?: string;
}
