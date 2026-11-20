import {Injectable} from '@nestjs/common';
import type {CreateAccountRequest, UpdateAccountRequest} from '@peco/contracts';
import {DataSource, IsNull, type QueryDeepPartialEntity} from 'typeorm';
import {UtcClock} from '../../database/clock/utc-clock';
import {AccountEntity} from '../../database/entities';
import type {AccountUpdateResult} from '../types/account-update-result.type';

/** Owner-scoped account reads and writes; soft-deleted rows are never returned (8.8). */
@Injectable()
export class AccountRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly clock: UtcClock,
  ) {}

  findActiveByUser(userId: number): Promise<AccountEntity[]> {
    return this.dataSource.getRepository(AccountEntity).find({
      where: {userId, deletedAt: IsNull()},
      order: {pinToHome: 'DESC', name: 'ASC', createdAt: 'ASC', id: 'ASC'},
    });
  }

  findActiveByPublicId(userId: number, publicId: string): Promise<AccountEntity | null> {
    return this.dataSource.getRepository(AccountEntity).findOne({
      where: {userId, publicId, deletedAt: IsNull()},
    });
  }

  /** Inserts a non-root account owned by `userId`, seeding balances from the request. */
  create(userId: number, request: CreateAccountRequest): Promise<AccountEntity> {
    const repository = this.dataSource.getRepository(AccountEntity);

    return repository.save(
      repository.create({
        userId,
        name: request.name,
        type: request.type,
        initialBalance: request.initialBalance,
        currentBalance: request.initialBalance,
        includeInTotal: request.includeInTotal ?? true,
        targetGoal: request.targetGoal ?? null,
        creditLimit: request.creditLimit ?? null,
        color: request.color ?? null,
        icon: request.icon ?? null,
        pinToHome: request.pinToHome ?? false,
        isRoot: false,
        note: request.note ?? null,
        version: 0,
        deletedAt: null,
      }),
    );
  }

  /**
   * Applies metadata changes with an atomic compare-and-set. QueryBuilder skips
   * entity subscribers, so `updatedAt` is stamped here and `version` is
   * incremented in SQL (D8/D18/US-303).
   */
  async update(
    userId: number,
    publicId: string,
    request: UpdateAccountRequest,
  ): Promise<AccountUpdateResult> {
    const repository = this.dataSource.getRepository(AccountEntity);
    const account = await repository.findOne({
      where: {userId, publicId, deletedAt: IsNull()},
    });
    if (!account) {
      return {status: 'not-found'};
    }

    const expectedVersion = request.version;
    if (expectedVersion !== undefined && account.version !== expectedVersion) {
      return {status: 'conflict', currentVersion: account.version};
    }

    const values: QueryDeepPartialEntity<AccountEntity> = {
      version: () => '`version` + 1',
      updatedAt: this.clock.now(),
    };
    if (request.name !== undefined) {
      values.name = request.name;
    }
    if (request.type !== undefined) {
      values.type = request.type;
    }
    if (request.includeInTotal !== undefined) {
      values.includeInTotal = request.includeInTotal;
    }
    if (request.targetGoal !== undefined) {
      values.targetGoal = request.targetGoal;
    }
    if (request.creditLimit !== undefined) {
      values.creditLimit = request.creditLimit;
    }
    if (request.color !== undefined) {
      values.color = request.color;
    }
    if (request.icon !== undefined) {
      values.icon = request.icon;
    }
    if (request.pinToHome !== undefined) {
      values.pinToHome = request.pinToHome;
    }
    if (request.note !== undefined) {
      values.note = request.note;
    }

    const hasMetadataChanges = Object.keys(values).some(
      (key) => key !== 'version' && key !== 'updatedAt',
    );
    if (!hasMetadataChanges) {
      return {status: 'updated', account};
    }

    const query = repository
      .createQueryBuilder()
      .update(AccountEntity)
      .set(values)
      .where('id = :id', {id: account.id})
      .andWhere('deletedAt IS NULL');
    if (expectedVersion !== undefined) {
      query.andWhere('version = :expectedVersion', {expectedVersion});
    }

    const result = await query.execute();
    if (result.affected === 0) {
      const current = await this.findActiveByPublicId(userId, publicId);

      return current
        ? {status: 'conflict', currentVersion: current.version}
        : {status: 'not-found'};
    }

    const updated = await this.findActiveByPublicId(userId, publicId);

    return updated ? {status: 'updated', account: updated} : {status: 'not-found'};
  }
}
