import {Injectable} from '@nestjs/common';
import type {CreateAccountRequest} from '@peco/contracts';
import {DataSource, IsNull} from 'typeorm';
import {AccountEntity} from '../../database/entities';

/** Owner-scoped account reads; soft-deleted rows are never returned (8.8). */
@Injectable()
export class AccountRepository {
  constructor(private readonly dataSource: DataSource) {}

  findActiveByUser(userId: number): Promise<AccountEntity[]> {
    return this.dataSource.getRepository(AccountEntity).find({
      where: {userId, deletedAt: IsNull()},
      order: {pinToHome: 'DESC', name: 'ASC', createdAt: 'ASC', id: 'ASC'},
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
}
