export interface CreateCategoryDTO {
  name: string;
  initialBalance: number;
  targetGoal?: number;
  color?: string;
  icon?: string;
}
