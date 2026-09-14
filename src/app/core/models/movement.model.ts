import {MovementType} from '../types/movement-type.type';

export interface Movement {
  id: string;
  accountId: string;
  type: MovementType;
  amount: number;
  date: string;
  note?: string;
  targetAccountId?: string;
  reversalId?: string;
  isReversal?: boolean;
}
