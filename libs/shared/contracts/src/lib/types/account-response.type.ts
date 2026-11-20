import type {AccountType} from './account-type.type';

/** Public account shape; internal ids and `initialBalance` never leave the API (8.8). */
export interface AccountResponse {
  publicId: string;
  name: string;
  type: AccountType;
  currentBalance: number;
  includeInTotal: boolean;
  targetGoal: number | null;
  creditLimit: number | null;
  color: string | null;
  icon: string | null;
  pinToHome: boolean;
  isRoot: boolean;
  note: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}
