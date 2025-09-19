import { LucideIcon } from 'lucide-react-native';
import { BaseEntity } from './_base';

export interface AccountType extends BaseEntity {
  name: string;
  displayName: string;
  description: string;
  icon: string; //TODO: handle it different
  color: string;

  iconItem?: LucideIcon;
}
