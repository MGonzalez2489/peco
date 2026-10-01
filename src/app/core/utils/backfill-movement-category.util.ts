import {Movement} from '../models/movement.model';
import {resolveDefaultCategoryId} from './resolve-default-category-id.util';

export const backfillMovementCategory = (movements: Movement[]): Movement[] =>
  movements.map((movement) =>
    movement.categoryId
      ? movement
      : {...movement, categoryId: resolveDefaultCategoryId(movement.type)},
  );
