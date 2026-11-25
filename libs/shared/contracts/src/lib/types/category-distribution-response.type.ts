import type {CategoryDistributionItem} from './category-distribution-item.type';
import type {MovementType} from './movement-type.type';

/** Owner-scoped category distribution returned by `GET /reports/categories/distribution` (8.13). */
export interface CategoryDistributionResponse {
  period: string;
  type: MovementType;
  total: number;
  items: CategoryDistributionItem[];
}
