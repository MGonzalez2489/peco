export interface CreateAccountDto {
  name: string;
  initialBalance: number;
  targetGoal?: number;
  color?: string;
  icon?: string;
  pinToHome?: boolean;
}
