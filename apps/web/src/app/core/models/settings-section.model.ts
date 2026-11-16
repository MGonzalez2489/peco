import {IconName} from '@shared/components/app-icon/app-icon.component';

export interface SettingsSection {
  path: string;
  title: string;
  description: string;
  icon: IconName;
  categoryGroup?: string;
}
