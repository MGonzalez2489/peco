import {Injectable} from '@nestjs/common';
import {Readable} from 'node:stream';
import {DataSource, IsNull, type ObjectType, type SelectQueryBuilder} from 'typeorm';
import {
  AccountEntity,
  AccountPeriodBalanceEntity,
  BaseEntity,
  CategoryEntity,
  MovementEntity,
  PeriodSnapshotEntity,
  ScheduledExecutionEntity,
  ScheduledTransactionEntity,
  UserPreferencesEntity,
} from '../../database/entities';

/** Bounded database reads keep a large export from living in memory at once. */
const PAGE_SIZE = 500;

/**
 * Read-only data access for D73. Every query starts from the caller's numeric
 * `userId`; rows without that column are reached through an owned parent.
 *
 * TypeORM's `.stream()` yields raw SQL rows (no boolean/value transformers and
 * no entity shape), so paging with `getMany()` feeds the response stream with
 * properly hydrated entities instead.
 */
@Injectable()
export class UserDataExportRepository {
  constructor(private readonly dataSource: DataSource) {}

  findPreferences(userId: number): Promise<UserPreferencesEntity | null> {
    return this.dataSource.getRepository(UserPreferencesEntity).findOne({
      where: {userId, deletedAt: IsNull()},
    });
  }

  findAccountPublicIds(userId: number): Promise<Map<number, string>> {
    return this.findPublicIds(AccountEntity, userId);
  }

  findCategoryPublicIds(userId: number): Promise<Map<number, string>> {
    return this.findPublicIds(CategoryEntity, userId);
  }

  findMovementPublicIds(userId: number): Promise<Map<number, string>> {
    return this.findPublicIds(MovementEntity, userId);
  }

  findScheduledTransactionPublicIds(userId: number): Promise<Map<number, string>> {
    return this.findPublicIds(ScheduledTransactionEntity, userId);
  }

  streamAccounts(userId: number): Readable {
    return this.streamOwned(AccountEntity, (query) =>
      query.where('row.userId = :userId', {userId}),
    );
  }

  streamCategories(userId: number): Readable {
    return this.streamOwned(CategoryEntity, (query) =>
      query.where('row.userId = :userId', {userId}),
    );
  }

  streamMovements(userId: number): Readable {
    return this.streamOwned(MovementEntity, (query) =>
      query.where('row.userId = :userId', {userId}),
    );
  }

  streamScheduledTransactions(userId: number): Readable {
    return this.streamOwned(ScheduledTransactionEntity, (query) =>
      query.where('row.userId = :userId', {userId}),
    );
  }

  /** Executions have no `userId`; ownership comes from the joined schedule. */
  streamScheduledExecutions(userId: number): Readable {
    return this.streamOwned(ScheduledExecutionEntity, (query) =>
      query
        .innerJoin('row.scheduledTransaction', 'schedule')
        .where('schedule.userId = :userId', {userId}),
    );
  }

  streamPeriodSnapshots(userId: number): Readable {
    return this.streamOwned(PeriodSnapshotEntity, (query) =>
      query.where('row.userId = :userId', {userId}),
    );
  }

  /** Snapshot labels are frozen, so balances are grouped by snapshot public id. */
  async findAccountBalancesBySnapshot(
    userId: number,
  ): Promise<Map<string, AccountPeriodBalanceEntity[]>> {
    const balances = await this.dataSource
      .getRepository(AccountPeriodBalanceEntity)
      .createQueryBuilder('balance')
      .leftJoinAndSelect('balance.snapshot', 'snapshot')
      .where('snapshot.userId = :userId', {userId})
      .orderBy('balance.id', 'ASC')
      .getMany();

    const grouped = new Map<string, AccountPeriodBalanceEntity[]>();
    for (const balance of balances) {
      const snapshotPublicId = balance.snapshot.publicId;
      const items = grouped.get(snapshotPublicId) ?? [];
      items.push(balance);
      grouped.set(snapshotPublicId, items);
    }
    return grouped;
  }

  private streamOwned<T extends BaseEntity>(
    target: ObjectType<T>,
    configure: (query: SelectQueryBuilder<T>) => SelectQueryBuilder<T>,
  ): Readable {
    return Readable.from(this.pageOwned(target, configure));
  }

  private async *pageOwned<T extends BaseEntity>(
    target: ObjectType<T>,
    configure: (query: SelectQueryBuilder<T>) => SelectQueryBuilder<T>,
  ): AsyncGenerator<T> {
    let offset = 0;

    for (;;) {
      const query = this.dataSource
        .getRepository(target)
        .createQueryBuilder('row')
        .orderBy('row.id', 'ASC')
        .skip(offset)
        .take(PAGE_SIZE);
      const rows = await configure(query).getMany();

      for (const row of rows) {
        yield row;
      }
      if (rows.length < PAGE_SIZE) {
        return;
      }
      offset += PAGE_SIZE;
    }
  }

  private async findPublicIds(
    target: ObjectType<BaseEntity>,
    userId: number,
  ): Promise<Map<number, string>> {
    const rows = await this.dataSource
      .getRepository(target)
      .createQueryBuilder('row')
      .select(['row.id', 'row.publicId'])
      .where('row.userId = :userId', {userId})
      .getMany();

    return new Map(rows.map((row) => [row.id, row.publicId]));
  }
}
