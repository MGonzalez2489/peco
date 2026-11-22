import type {MovementType} from '@peco/contracts';
import {MovementTypeEnum} from '@peco/enums';

/** Spanish noun embedded in the generated note of a system contra entry (9.6/US-507). */
export const REVERSAL_NOTE_LABELS: Record<MovementType, string> = {
  [MovementTypeEnum.INCOME.toString()]: 'ingreso',
  [MovementTypeEnum.EXPENSE.toString()]: 'egreso',
  [MovementTypeEnum.TRANSFER.toString()]: 'transferencia',
};
