import type {CategoryEntity} from '../../database/entities';

/** Active category metadata exposed by a distribution and used for root fallback (D43). */
export type CategoryDistributionCategory = Pick<
  CategoryEntity,
  'id' | 'publicId' | 'userId' | 'displayName' | 'color' | 'icon' | 'isRoot'
>;
