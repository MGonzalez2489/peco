import {MovementType} from '../types/movement-type.type';

export interface Movement {
  id: string;
  accountId: string;
  categoryId: string;
  type: MovementType;
  /** Positive magnitude in integer cents; the direction comes from `type`. */
  amount: number;
  date: string;
  note?: string;
  targetAccountId?: string;
  reversalId?: string;
  isReversal?: boolean;
  isCanceled?: boolean;
  scheduledTransactionId?: string;
}
