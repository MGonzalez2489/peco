import {AccountType} from '../types/account-type.type';

export interface Account {
  id: string;
  name: string;
  currentBalance: number;
  type: AccountType;
  includeInTotal: boolean;
  createdAt: string;
  targetGoal?: number;
  creditLimit?: number;
  color?: string;
  icon?: string;
  pinToHome?: boolean;
  isRoot?: boolean;
  note?: string;
}
