import {MovementFilterType} from '../types/movement-filter-type.type';

export interface MovementFilters {
  type: MovementFilterType;
  accountId: string;
  categoryId: string;
  hideReversals: boolean;
}
