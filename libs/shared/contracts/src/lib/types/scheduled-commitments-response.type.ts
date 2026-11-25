import type {CategoryDistributionItem} from './category-distribution-item.type';

/** Owner-scoped monthly commitments and projections returned by `GET /reports/scheduled/commitments` (8.13). */
export interface ScheduledCommitmentsResponse {
  period: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  netProjectedImpact: number;
  projectedAvailableBalance: number;
  incomeCommitmentPercentage: number;
  expenseDistribution: CategoryDistributionItem[];
  incomeDistribution: CategoryDistributionItem[];
}
