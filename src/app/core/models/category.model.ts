import {IconName} from '@shared/components/app-icon/app-icon.component';
import {CategoryApplyType} from '../types/category-apply-type.type';

export interface Category {
  id: string;
  name: string;
  displayName: string;
  icon: IconName;
  color: string;
  applyType: CategoryApplyType;
  isRoot?: boolean;
}
