import {MovementTypeEnum} from '@peco/enums';
import type {MovementEntity} from '../../database/entities';

/** Signed balance impact per account; a transfer touches source and target (9.3/9.4). */
export const movementBalanceImpact = (
  type: MovementEntity['type'],
  amount: number,
  sourceId: number,
  targetId: number | null,
): Map<number, number> => {
  const impact = new Map<number, number>();

  if (type === MovementTypeEnum.INCOME.toString()) {
    impact.set(sourceId, (impact.get(sourceId) ?? 0) + amount);
  } else if (type === MovementTypeEnum.EXPENSE.toString()) {
    impact.set(sourceId, (impact.get(sourceId) ?? 0) - amount);
  } else if (type === MovementTypeEnum.TRANSFER.toString()) {
    impact.set(sourceId, (impact.get(sourceId) ?? 0) - amount);
    if (targetId !== null) {
      impact.set(targetId, (impact.get(targetId) ?? 0) + amount);
    }
  }

  return impact;
};
