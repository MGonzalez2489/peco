import type {MovementType} from '@peco/contracts';
import {CategoryApplyTypeEnum} from '@peco/enums';
import type {CategoryEntity} from '../../database/entities';

/** `BOTH` accepts both directions; the other values must match the movement type. */
export const movementCategoryAcceptsType = (
  applyType: CategoryEntity['applyType'],
  type: MovementType,
): boolean => applyType === CategoryApplyTypeEnum.BOTH.toString() || applyType === type;
