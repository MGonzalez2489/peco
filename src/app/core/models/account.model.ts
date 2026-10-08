export interface Account {
  id: string;
  name: string;
  currentBalance: number;
  includeInTotal: boolean;
  targetGoal?: number;
  color?: string;
  icon?: string;
  pinToHome?: boolean;
  isRoot?: boolean;
  note?: string;
}
