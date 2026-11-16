import {Movement} from '../models/movement.model';
import {MovementType} from '../types/movement-type.type';

const REVERSAL_LABELS: Record<MovementType, string> = {
  INCOME: 'ingreso',
  EXPENSE: 'egreso',
  TRANSFER: 'transferencia',
};

const REVERSAL_TYPES: Record<MovementType, MovementType> = {
  INCOME: 'EXPENSE',
  EXPENSE: 'INCOME',
  TRANSFER: 'TRANSFER',
};

export const buildReversalMovement = (original: Movement): Movement => ({
  id: crypto.randomUUID(),
  date: new Date().toISOString(),
  accountId:
    original.type === 'TRANSFER'
      ? (original.targetAccountId ?? original.accountId)
      : original.accountId,
  categoryId: original.categoryId,
  type: REVERSAL_TYPES[original.type],
  amount: original.amount,
  note: `Reversión de ${REVERSAL_LABELS[original.type]} ${original.id}`,
  targetAccountId: original.type === 'TRANSFER' ? original.accountId : original.targetAccountId,
  reversalId: original.id,
  isReversal: true,
});
