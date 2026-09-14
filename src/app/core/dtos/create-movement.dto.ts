import {MovementType} from '../types/movement-type.type';

export interface CreateMovementDTO {
  accountId: string;
  type: MovementType;
  amount: number;
  date?: string;
  note?: string;
  targetAccountId?: string;
}
