export interface Account {
  id: string;
  name: string;
  currentBalance: number;
  includeInTotal: boolean;
  createdAt: string; // Mandatory ISO string timestamp (e.g., '2026-01-15T08:00:00.000Z')
  targetGoal?: number;
  color?: string;
  icon?: string;
  pinToHome?: boolean;
  isRoot?: boolean;
  note?: string;
}
