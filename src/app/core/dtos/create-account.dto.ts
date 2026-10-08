export interface CreateAccountDto {
  name: string;
  initialBalance: number;
  includeInTotal?: boolean;
  targetGoal?: number;
  color?: string;
  icon?: string;
  pinToHome?: boolean;
  note?: string;
}
