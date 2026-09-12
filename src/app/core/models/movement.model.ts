import {MovementType} from '../types/movement-type.type';

export interface Movement {
  id: string;
  categoryId: string;
  type: MovementType;
  amount: number;
  date: string;
  note?: string;
  destinationCategoryId?: string;
  reversalId?: string;
  isReversal?: boolean;
}
