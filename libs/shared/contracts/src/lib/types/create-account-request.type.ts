import type {AccountType} from './account-type.type';

/** Account creation body; `initialBalance` is integer cents and always required (8.8/US-302). */
export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  initialBalance: number;
  includeInTotal?: boolean;
  targetGoal?: number | null;
  creditLimit?: number | null;
  color?: string | null;
  icon?: string | null;
  pinToHome?: boolean;
  note?: string | null;
}
