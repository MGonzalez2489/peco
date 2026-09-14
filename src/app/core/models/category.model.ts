import {CategoryApplyType} from '../types/category-apply-type.type';

export interface Category {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  applyType: CategoryApplyType;
}
