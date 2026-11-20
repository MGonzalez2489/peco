import {Injectable} from '@nestjs/common';
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
}
