import {IconName} from '@shared/components/app-icon/app-icon.component';
import {CategoryApplyType} from '../types/category-apply-type.type';

export const CATEGORY_APPLY_TYPE_VISUALS: Record<
  CategoryApplyType,
  {icon: IconName; color: string}
> = {
  INCOME: {icon: 'chevron-up', color: '#10B981'},
  EXPENSE: {icon: 'chevron-down', color: '#F43F5E'},
  BOTH: {icon: 'arrow-left-right', color: '#6366F1'},
  TRANSFER: {icon: 'arrow-left-right', color: '#0EA5E9'},
};
