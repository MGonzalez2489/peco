import type {CategoryApplyType} from './category-apply-type.type';

/** Mutable user-category metadata for `PATCH /categories/:publicId` (8.9/US-402). */
export interface UpdateCategoryRequest {
  displayName?: string;
  icon?: string | null;
  color?: string | null;
  applyType?: CategoryApplyType;
}
