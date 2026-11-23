import {Injectable} from '@nestjs/common';
import {RecurrenceFrequencyEnum} from '@peco/enums';
import {DataSource, IsNull, type SelectQueryBuilder} from 'typeorm';
import {
  AccountEntity,
  CategoryEntity,
  ScheduledExecutionEntity,
  ScheduledTransactionEntity,
} from '../../database/entities';
import type {ScheduledTransactionListFilter} from '../types/scheduled-transaction-list-filter.type';
import type {ScheduledTransactionListResult} from '../types/scheduled-transaction-list-result.type';
import {decodeScheduledTransactionCursor} from '../utils/decode-scheduled-transaction-cursor.util';
import {encodeScheduledTransactionCursor} from '../utils/encode-scheduled-transaction-cursor.util';

/** Owner-scoped schedule reads with period isolation and keyset pages (8.11/US-602). */
@Injectable()
export class ScheduledTransactionQueryRepository {
  constructor(private readonly dataSource: DataSource) {}

  async list(
    filter: ScheduledTransactionListFilter,
    cursor: string | undefined,
    limit: number,
  ): Promise<ScheduledTransactionListResult> {
    const decoded = cursor ? decodeScheduledTransactionCursor(cursor) : null;
    if (cursor && !decoded) {
      throw new Error('Invalid scheduled transaction cursor');
    }

    const page = this.filteredQuery(filter, true)
      .orderBy('schedule.nextExecutionDate', 'ASC')
      .addOrderBy('schedule.id', 'ASC')
      .take(limit + 1);
    if (decoded) {
      page.andWhere(
        `(schedule.nextExecutionDate > :cursorDate OR (schedule.nextExecutionDate = :cursorDate AND schedule.id > :cursorId))`,
        {cursorDate: decoded.date, cursorId: decoded.id},
      );
    }

    const rows = await page.getMany();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];

    return {
      items,
      nextCursor:
        hasMore && last
          ? encodeScheduledTransactionCursor({date: last.nextExecutionDate, id: last.id})
          : null,
    };
  }

  /** Owner-scoped detail with the summaries needed by the public response. */
  findOwnerDetail(userId: number, publicId: string): Promise<ScheduledTransactionEntity | null> {
    return this.withRelations(this.baseQuery())
      .where('schedule.userId = :userId', {userId})
      .andWhere('schedule.publicId = :publicId', {publicId})
      .andWhere('schedule.deletedAt IS NULL')
      .getOne();
  }

  findActiveAccount(userId: number, publicId: string): Promise<AccountEntity | null> {
    return this.dataSource.getRepository(AccountEntity).findOne({
      where: {userId, publicId, deletedAt: IsNull()},
    });
  }

  findVisibleCategory(userId: number, publicId: string): Promise<CategoryEntity | null> {
    return this.dataSource.getRepository(CategoryEntity).findOne({
      where: [
        {publicId, userId: IsNull(), deletedAt: IsNull()},
        {publicId, userId, deletedAt: IsNull()},
      ],
    });
  }

  lastProcessedContemplatedDate(scheduleId: number): Promise<string | null> {
    return this.dataSource
      .getRepository(ScheduledExecutionEntity)
      .createQueryBuilder('execution')
      .select('MAX(execution.contemplatedDate)', 'lastDate')
      .where('execution.scheduledTransactionId = :scheduleId', {scheduleId})
      .getRawOne<{lastDate: string | null}>()
      .then((row) => row?.lastDate ?? null);
  }

  hasExecutionAt(scheduleId: number, contemplatedDate: string): Promise<boolean> {
    return this.dataSource
      .getRepository(ScheduledExecutionEntity)
      .createQueryBuilder('execution')
      .select('1')
      .where('execution.scheduledTransactionId = :scheduleId', {scheduleId})
      .andWhere('execution.contemplatedDate = :contemplatedDate', {contemplatedDate})
      .limit(1)
      .getRawOne()
      .then((row) => row !== undefined);
  }

  private baseQuery(): SelectQueryBuilder<ScheduledTransactionEntity> {
    return this.dataSource.getRepository(ScheduledTransactionEntity).createQueryBuilder('schedule');
  }

  private withRelations(
    query: SelectQueryBuilder<ScheduledTransactionEntity>,
  ): SelectQueryBuilder<ScheduledTransactionEntity> {
    return query
      .leftJoinAndSelect('schedule.category', 'category')
      .leftJoinAndSelect('schedule.sourceAccount', 'sourceAccount')
      .leftJoinAndSelect('schedule.destinationAccount', 'destinationAccount');
  }

  private filteredQuery(
    filter: ScheduledTransactionListFilter,
    withRelations: boolean,
  ): SelectQueryBuilder<ScheduledTransactionEntity> {
    const query = withRelations
      ? this.withRelations(this.baseQuery())
      : this.baseQuery()
          .leftJoin('schedule.sourceAccount', 'sourceAccount')
          .leftJoin('schedule.destinationAccount', 'destinationAccount');

    query
      .where('schedule.userId = :userId', {userId: filter.userId})
      .andWhere('schedule.deletedAt IS NULL');

    this.addPeriodPredicate(query, filter);
    if (filter.type) {
      query.andWhere('schedule.type = :type', {type: filter.type});
    }
    if (filter.active !== undefined) {
      query.andWhere('schedule.active = :active', {active: filter.active});
    }
    if (filter.autoApply !== undefined) {
      query.andWhere('schedule.autoApply = :autoApply', {autoApply: filter.autoApply});
    }
    if (filter.accountPublicId) {
      query.andWhere(
        '(sourceAccount.publicId = :accountPublicId OR destinationAccount.publicId = :accountPublicId)',
        {accountPublicId: filter.accountPublicId},
      );
    }
    if (filter.search) {
      const escaped = filter.search.toLowerCase().replace(/[!%_]/g, '!$&');
      query.andWhere(`LOWER(schedule.name) LIKE :search ESCAPE '!'`, {
        search: `%${escaped}%`,
      });
    }

    return query;
  }

  /** Past = processed rows; current = processed plus pending; future = projected grid (8.11). */
  private addPeriodPredicate(
    query: SelectQueryBuilder<ScheduledTransactionEntity>,
    filter: ScheduledTransactionListFilter,
  ): void {
    query.andWhere('schedule.anchorDate <= :periodTo', {periodTo: filter.periodTo});

    if (filter.periodPosition === 'past') {
      query.andWhere(this.processedInPeriod(), {
        periodFrom: filter.periodFrom,
        periodTo: filter.periodTo,
      });
      return;
    }

    if (filter.periodPosition === 'current') {
      query.andWhere(
        `(${this.processedInPeriod()} OR schedule.nextExecutionDate BETWEEN :periodFrom AND :periodTo)`,
        {periodFrom: filter.periodFrom, periodTo: filter.periodTo},
      );
      return;
    }

    query.andWhere('schedule.active = 1');
    query.andWhere('(schedule.endDate IS NULL OR schedule.endDate >= :periodFrom)', {
      periodFrom: filter.periodFrom,
    });
    query.andWhere(
      `(schedule.frequency = :yearly AND MONTH(schedule.nextContemplatedDate) = MONTH(:periodFrom)
         AND YEAR(:periodFrom) >= YEAR(schedule.nextContemplatedDate)
         AND MOD(YEAR(:periodFrom) - YEAR(schedule.nextContemplatedDate), schedule.interval) = 0)
       OR (schedule.frequency <> :yearly AND schedule.nextExecutionDate <= :periodTo)`,
      {
        yearly: RecurrenceFrequencyEnum.YEARLY.toString(),
        periodFrom: filter.periodFrom,
        periodTo: filter.periodTo,
      },
    );
  }

  private processedInPeriod(): string {
    return `EXISTS (
      SELECT 1 FROM scheduledExecutions execution
      WHERE execution.scheduledTransactionId = schedule.id
        AND COALESCE(execution.occurrenceDate, execution.contemplatedDate) BETWEEN :periodFrom AND :periodTo
    )`;
  }
}
