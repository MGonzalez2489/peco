import {AccountType} from '../types/account-type.type';

export interface CreateAccountDto {
  name: string;
  /** Initial balance in integer cents. */
  initialBalance: number;
  type: AccountType;
  includeInTotal?: boolean;
  /** Savings goal in integer cents. */
  targetGoal?: number;
  /** Credit limit in integer cents. */
  creditLimit?: number;
  pinToHome?: boolean;
  note?: string;
  createdAt?: string;
}
