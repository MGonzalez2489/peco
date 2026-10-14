import {AccountType} from './account-type.model';

export interface Account {
  id: string;
  name: string;
  currentBalance: number;
  type: AccountType; // Mandatory account classification
  includeInTotal: boolean;
  createdAt: string; // Mandatory ISO string timestamp (e.g., '2026-01-15T08:00:00.000Z')
  targetGoal?: number;
  pinToHome?: boolean;
  isRoot?: boolean;
  note?: string;
}
