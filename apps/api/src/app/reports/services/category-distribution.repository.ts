import {Injectable} from '@nestjs/common';
import {MovementTypeEnum} from '@peco/enums';
import {Between, DataSource, In, IsNull} from 'typeorm';
import {CategoryEntity, MovementEntity} from '../../database/entities';
import {periodUtcBounds} from '../../movements/utils/period-utc-bounds.util';
import {PERIOD_LEDGER_BATCH_SIZE} from '../../periods/constants/period-ledger-batch-size.constant';
import type {CategoryDistributionCategory} from '../types/category-distribution-category.type';
import type {CategoryDistributionRow} from '../types/category-distribution-row.type';

/** Owner-scoped ledger and active-category reads for one category distribution (US-804). */
@Injectable()
export class CategoryDistributionRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** Active global and owner categories, including the global root used for reassigned rows. */
  async findVisibleCategories(userId: number): Promise<CategoryDistributionCategory[]> {
    return this.dataSource.getRepository(CategoryEntity).find({
      select: {
        id: true,
        publicId: true,
        userId: true,
        displayName: true,
        color: true,
        icon: true,
        isRoot: true,
      },
      where: [
        {userId: IsNull(), deletedAt: IsNull()},
        {userId, deletedAt: IsNull()},
      ],
      order: {isRoot: 'DESC', displayName: 'ASC', id: 'ASC'},
    });
  }

  /** Non-canceled income/expense rows of the UTC month in bounded batches (D63). */
  async findPeriodMovements(userId: number, period: string): Promise<CategoryDistributionRow[]> {
    const {from, to} = periodUtcBounds(period);
    const movements = this.dataSource.getRepository(MovementEntity);
    const rows: CategoryDistributionRow[] = [];
    let skip = 0;

    for (;;) {
      const batch = await movements.find({
        where: {
          userId,
          deletedAt: IsNull(),
          date: Between(from, to),
          isCanceled: false,
          type: In([
            MovementTypeEnum.INCOME.toString(),
            MovementTypeEnum.EXPENSE.toString(),
          ]),
        },
        select: {id: true, categoryId: true, type: true, amount: true},
        order: {date: 'ASC', id: 'ASC'},
        take: PERIOD_LEDGER_BATCH_SIZE,
        skip,
      });
      rows.push(...batch);
      if (batch.length < PERIOD_LEDGER_BATCH_SIZE) {
        return rows;
      }
      skip += batch.length;
    }
  }
}
