import {Injectable} from '@nestjs/common';
import type {MovementTotals} from '@peco/contracts';
import {MovementTypeEnum} from '@peco/enums';
import {DataSource, type SelectQueryBuilder} from 'typeorm';
import {MovementEntity} from '../../database/entities';
import type {MovementListFilter} from '../types/movement-list-filter.type';
import type {MovementListResult} from '../types/movement-list-result.type';
import {decodeMovementCursor} from '../utils/decode-movement-cursor.util';
import {encodeMovementCursor} from '../utils/encode-movement-cursor.util';

/** Owner-scoped ledger reads: one keyset page plus totals over the whole filter (8.4/D38). */
@Injectable()
export class MovementQueryRepository {
  constructor(private readonly dataSource: DataSource) {}

  async list(
    filter: MovementListFilter,
    cursor: string | undefined,
    limit: number,
  ): Promise<MovementListResult> {
    const decoded = cursor ? decodeMovementCursor(cursor) : null;
    if (cursor && !decoded) {
      // DTO validation already rejects this; keep direct callers from skipping the guard.
      throw new Error('Invalid movement cursor');
    }

    const page = this.filteredQuery(filter, true)
      .orderBy('movement.date', 'DESC')
      .addOrderBy('movement.id', 'DESC')
      .take(limit + 1);
    if (decoded) {
      page.andWhere(
        '(movement.date < :cursorDate OR (movement.date = :cursorDate AND movement.id < :cursorId))',
        {cursorDate: decoded.date, cursorId: decoded.id},
      );
    }

    const rows = await page.getMany();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last ? encodeMovementCursor({date: last.date, id: last.id}) : null;

    return {items, nextCursor, totals: await this.totals(filter)};
  }

  /** Builds the shared predicate for both the page and the aggregate query. */
  private filteredQuery(
    filter: MovementListFilter,
    withRelations: boolean,
  ): SelectQueryBuilder<MovementEntity> {
    const query = this.dataSource.getRepository(MovementEntity).createQueryBuilder('movement');

    if (withRelations) {
      query
        .leftJoinAndSelect('movement.account', 'account')
        .leftJoinAndSelect('movement.targetAccount', 'targetAccount')
        .leftJoinAndSelect('movement.category', 'category');
    } else {
      query
        .leftJoin('movement.account', 'account')
        .leftJoin('movement.targetAccount', 'targetAccount')
        .leftJoin('movement.category', 'category');
    }

    query.where('movement.userId = :userId', {userId: filter.userId}).andWhere(
      'movement.deletedAt IS NULL',
    );

    if (filter.from) {
      query.andWhere('movement.date >= :from', {from: filter.from});
    }
    if (filter.to) {
      query.andWhere('movement.date <= :to', {to: filter.to});
    }
    if (filter.type) {
      query.andWhere('movement.type = :type', {type: filter.type});
    }
    if (filter.accountPublicId) {
      query.andWhere(
        '(account.publicId = :accountPublicId OR targetAccount.publicId = :accountPublicId)',
        {accountPublicId: filter.accountPublicId},
      );
    }
    if (filter.accountType) {
      query.andWhere('(account.type = :accountType OR targetAccount.type = :accountType)', {
        accountType: filter.accountType,
      });
    }
    if (filter.categoryPublicId) {
      query.andWhere('category.publicId = :categoryPublicId', {
        categoryPublicId: filter.categoryPublicId,
      });
    }
    if (filter.note) {
      const escaped = filter.note.toLowerCase().replace(/[!%_]/g, '!$&');
      query.andWhere(`LOWER(movement.note) LIKE :note ESCAPE '!'`, {note: `%${escaped}%`});
    }
    if (filter.excludeReversals) {
      query.andWhere('movement.isReversal = 0 AND movement.isReversed = 0');
    }
    if (!filter.includeCanceled) {
      query.andWhere('movement.isCanceled = 0');
    }

    return query;
  }

  /**
   * A transfer is one distinct row and never adds to global income/expense (D63).
   * Canceled rows appear in `count` when requested but carry no balance impact (9.2).
   */
  private async totals(filter: MovementListFilter): Promise<MovementTotals> {
    const raw = await this.filteredQuery(filter, false)
      .select('COUNT(DISTINCT movement.id)', 'count')
      .addSelect(
        `SUM(CASE WHEN movement.type = :income AND movement.isCanceled = 0 THEN movement.amount ELSE 0 END)`,
        'totalIncome',
      )
      .addSelect(
        `SUM(CASE WHEN movement.type = :expense AND movement.isCanceled = 0 THEN movement.amount ELSE 0 END)`,
        'totalExpenses',
      )
      .setParameters({
        income: MovementTypeEnum.INCOME.toString(),
        expense: MovementTypeEnum.EXPENSE.toString(),
      })
      .getRawOne<{count: string; totalIncome: string | null; totalExpenses: string | null}>();

    const totalIncome = Number(raw?.totalIncome ?? 0);
    const totalExpenses = Number(raw?.totalExpenses ?? 0);

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      count: Number(raw?.count ?? 0),
    };
  }
}
