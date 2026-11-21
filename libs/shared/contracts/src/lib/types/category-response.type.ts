import type {CategoryApplyType} from './category-apply-type.type';

/** Public category shape; internal ids and owner never leave the API (8.9). */
export interface CategoryResponse {
  publicId: string;
  name: string;
  displayName: string;
  icon: string | null;
  color: string | null;
  applyType: CategoryApplyType;
  isRoot: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}
