import {AccountType} from '../models/account-type.model';

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
