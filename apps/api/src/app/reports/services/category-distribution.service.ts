import {Injectable} from '@nestjs/common';
import type {CategoryDistributionResponse, MovementType} from '@peco/contracts';
import {periodReadException} from '../../periods/utils/period-read.exception';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import {buildCategoryDistribution} from '../utils/build-category-distribution.util';
import {CategoryDistributionRepository} from './category-distribution.repository';

/**
 * Owner-scoped category breakdown (US-804). Snapshots do not store category
 * slices, so both open and closed months derive the same shape from the ledger.
 */
@Injectable()
export class CategoryDistributionService {
  constructor(
    private readonly users: UserProfileRepository,
    private readonly distribution: CategoryDistributionRepository,
  ) {}

  async find(
    userPublicId: string,
    period: string,
    type: MovementType,
  ): Promise<CategoryDistributionResponse> {
    const user = await this.users.findActiveByPublicId(userPublicId);
    if (!user) {
      throw periodReadException();
    }

    const [movements, categories] = await Promise.all([
      this.distribution.findPeriodMovements(user.id, period),
      this.distribution.findVisibleCategories(user.id),
    ]);
    const {total, items} = buildCategoryDistribution(type, movements, categories);

    return {period, type, total, items};
  }
}
