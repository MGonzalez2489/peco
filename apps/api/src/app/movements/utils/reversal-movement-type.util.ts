import type {MovementType} from '@peco/contracts';
import {MovementTypeEnum} from '@peco/enums';

/** Mirrors a movement type: income/expense swap, a transfer stays a transfer (9.6). */
export const reversalMovementType = (type: MovementType): MovementType => {
  if (type === MovementTypeEnum.INCOME.toString()) {
    return MovementTypeEnum.EXPENSE.toString();
  }
  if (type === MovementTypeEnum.EXPENSE.toString()) {
    return MovementTypeEnum.INCOME.toString();
  }
  return MovementTypeEnum.TRANSFER.toString();
};
