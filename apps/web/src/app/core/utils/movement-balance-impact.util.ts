import {Movement} from '../models/movement.model';
import {MovementTypeEnum} from '@peco/enums';

export function movementBalanceImpact(movement: Movement, accountId: string): number {
  if (movement.isCanceled) return 0;

  switch (movement.type) {
    case MovementTypeEnum.INCOME.toString():
      return movement.accountId === accountId ? movement.amount : 0;
    case MovementTypeEnum.EXPENSE.toString():
      return movement.accountId === accountId ? -movement.amount : 0;
    case MovementTypeEnum.TRANSFER.toString():
      if (movement.accountId === accountId) return -movement.amount;
      if (movement.targetAccountId === accountId) return movement.amount;
      return 0;
  }
}
