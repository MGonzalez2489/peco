import {AccountType} from '../types/account-type.type';

export interface Account {
  id: string;
  name: string;
  /** Current balance in integer cents. */
  currentBalance: number;
  type: AccountType;
  includeInTotal: boolean;
  createdAt: string;
  /** Savings goal in integer cents. */
  targetGoal?: number;
  /** Credit limit in integer cents. */
  creditLimit?: number;
  color?: string;
  icon?: string;
  pinToHome?: boolean;
  isRoot?: boolean;
  note?: string;
}
