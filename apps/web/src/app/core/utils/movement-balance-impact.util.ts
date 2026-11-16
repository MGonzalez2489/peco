import {Movement} from '../models/movement.model';

export function movementBalanceImpact(movement: Movement, accountId: string): number {
  if (movement.isCanceled) return 0;

  switch (movement.type) {
    case 'INCOME':
      return movement.accountId === accountId ? movement.amount : 0;
    case 'EXPENSE':
      return movement.accountId === accountId ? -movement.amount : 0;
    case 'TRANSFER':
      if (movement.accountId === accountId) return -movement.amount;
      if (movement.targetAccountId === accountId) return movement.amount;
      return 0;
  }
}
