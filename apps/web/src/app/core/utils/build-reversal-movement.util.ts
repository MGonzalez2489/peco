import {Movement} from '../models/movement.model';
import {MovementType} from '../types/movement-type.type';
import {MovementTypeEnum} from '@peco/enums';

const REVERSAL_LABELS: Record<MovementType, string> = {
  [MovementTypeEnum.INCOME.toString()]: 'ingreso',
  [MovementTypeEnum.EXPENSE.toString()]: 'egreso',
  [MovementTypeEnum.TRANSFER.toString()]: 'transferencia',
};

const REVERSAL_TYPES: Record<MovementType, MovementType> = {
  [MovementTypeEnum.INCOME.toString()]: MovementTypeEnum.EXPENSE.toString(),
  [MovementTypeEnum.EXPENSE.toString()]: MovementTypeEnum.INCOME.toString(),
  [MovementTypeEnum.TRANSFER.toString()]: MovementTypeEnum.TRANSFER.toString(),
};

export const buildReversalMovement = (original: Movement): Movement => ({
  id: crypto.randomUUID(),
  date: new Date().toISOString(),
  accountId:
    original.type === MovementTypeEnum.TRANSFER.toString()
      ? (original.targetAccountId ?? original.accountId)
      : original.accountId,
  categoryId: original.categoryId,
  type: REVERSAL_TYPES[original.type],
  amount: original.amount,
  note: `Reversión de ${REVERSAL_LABELS[original.type]} ${original.id}`,
  targetAccountId:
    original.type === MovementTypeEnum.TRANSFER.toString()
      ? original.accountId
      : original.targetAccountId,
  reversalId: original.id,
  isReversal: true,
});
