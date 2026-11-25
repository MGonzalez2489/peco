import {Injectable} from '@nestjs/common';
import type {ScheduledCommitmentsResponse} from '@peco/contracts';
import {MovementTypeEnum} from '@peco/enums';
import {buildAccountSummary} from '@peco/utils';
import {AccountRepository} from '../../accounts/services/account.repository';
import {UtcClock} from '../../database/clock/utc-clock';
import {periodUtcBounds} from '../../movements/utils/period-utc-bounds.util';
import {periodReadException} from '../../periods/utils/period-read.exception';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import type {ScheduledCommitmentAllocation} from '../types/scheduled-commitment-allocation.type';
import {buildCategoryDistribution} from '../utils/build-category-distribution.util';
import {buildScheduledCommitments} from '../utils/build-scheduled-commitments.util';
import {CategoryDistributionRepository} from './category-distribution.repository';
import {ScheduledCommitmentsRepository} from './scheduled-commitments.repository';

/** Owner-scoped monthly commitments in the §8.13 shape (US-805). */
@Injectable()
export class ScheduledCommitmentsService {
  constructor(
    private readonly users: UserProfileRepository,
    private readonly commitments: ScheduledCommitmentsRepository,
    private readonly categories: CategoryDistributionRepository,
    private readonly accounts: AccountRepository,
    private readonly clock: UtcClock,
  ) {}

  async find(userPublicId: string, period: string): Promise<ScheduledCommitmentsResponse> {
    const user = await this.users.findActiveByPublicId(userPublicId);
    if (!user) {
      throw periodReadException();
    }

    const {from, to} = periodUtcBounds(period);
    const periodFrom = from.slice(0, 10);
    const periodTo = to.slice(0, 10);
    const includePending = period >= this.clock.now().slice(0, 7);
    const pendingSchedules = includePending
      ? this.commitments.findPendingSchedules(user.id)
      : Promise.resolve([]);

    const [executions, schedules, categories, accounts] = await Promise.all([
      this.commitments.findApplied(user.id, periodFrom, periodTo),
      pendingSchedules,
      this.categories.findVisibleCategories(user.id),
      this.accounts.findActiveByUser(user.id),
    ]);
    const allocations = buildScheduledCommitments(
      periodFrom,
      periodTo,
      includePending,
      executions,
      schedules,
    );

    const income = this.totalFor(allocations, MovementTypeEnum.INCOME.toString());
    const expenses = this.totalFor(allocations, MovementTypeEnum.EXPENSE.toString());
    const availableBalance = buildAccountSummary(accounts).availableBalance;
    const rawPercentage = income > 0 ? Math.round((expenses / income) * 100) : 0;

    return {
      period,
      monthlyIncome: income,
      monthlyExpenses: expenses,
      netProjectedImpact: income - expenses,
      projectedAvailableBalance: availableBalance + income - expenses,
      incomeCommitmentPercentage: Math.min(100, Math.max(0, rawPercentage)),
      expenseDistribution: this.distribution(
        allocations,
        categories,
        MovementTypeEnum.EXPENSE.toString(),
      ),
      incomeDistribution: this.distribution(
        allocations,
        categories,
        MovementTypeEnum.INCOME.toString(),
      ),
    };
  }

  private totalFor(
    allocations: readonly ScheduledCommitmentAllocation[],
    type: ScheduledCommitmentAllocation['type'],
  ): number {
    return allocations
      .filter((allocation) => allocation.type === type)
      .reduce((total, allocation) => total + allocation.amount, 0);
  }

  private distribution(
    allocations: readonly ScheduledCommitmentAllocation[],
    categories: Awaited<ReturnType<CategoryDistributionRepository['findVisibleCategories']>>,
    type: ScheduledCommitmentAllocation['type'],
  ) {
    const rows = allocations.map((allocation) => ({
      id: allocation.id,
      categoryId: allocation.categoryId,
      type: allocation.type,
      amount: allocation.amount,
    }));

    return buildCategoryDistribution(type, rows, categories).items;
  }
}
