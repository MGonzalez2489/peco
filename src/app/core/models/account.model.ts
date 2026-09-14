export interface Account {
  id: string;
  name: string;
  currentBalance: number;
  targetGoal?: number;
  color?: string;
  icon?: string;
  pinToHome?: boolean;
  isRoot?: boolean;
}
