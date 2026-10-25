import {MovementType} from '../types/movement-type.type';

export interface CreateMovementDTO {
  accountId: string;
  categoryId: string;
  type: MovementType;
  /** Positive magnitude in integer cents; the direction comes from `type`. */
  amount: number;
  date?: string;
  note?: string;
  targetAccountId?: string;
}
