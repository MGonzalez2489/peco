import {AccountType} from '../types/account-type.type';

export interface CreateAccountDto {
  name: string;
  initialBalance: number;
  type: AccountType;
  includeInTotal?: boolean;
  targetGoal?: number;
  creditLimit?: number;
  pinToHome?: boolean;
  note?: string;
  createdAt?: string;
}
