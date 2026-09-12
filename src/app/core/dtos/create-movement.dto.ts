import {MovementType} from '../types/movement-type.type';

export interface CreateMovementDTO {
  categoryId: string;
  type: MovementType;
  amount: number;
  date?: string;
  note?: string;
  destinationCategoryId?: string;
}
