import type {MovementType} from '@peco/contracts';

/** One applied or planned income/expense amount in a period commitment report (US-805). */
export interface ScheduledCommitmentAllocation {
  id: number;
  categoryId: number;
  type: MovementType;
  amount: number;
}
