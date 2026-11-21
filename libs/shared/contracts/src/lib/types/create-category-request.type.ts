import type {CategoryApplyType} from './category-apply-type.type';

/** Category creation body; `name` is server-derived and user rows are never system/root (8.9/US-402). */
export interface CreateCategoryRequest {
  displayName: string;
  icon?: string | null;
  color?: string | null;
  applyType: CategoryApplyType;
}
