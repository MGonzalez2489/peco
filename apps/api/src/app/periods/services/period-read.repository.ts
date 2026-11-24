import {Injectable} from '@nestjs/common';
import {Between, DataSource} from 'typeorm';
import {AccountPeriodBalanceEntity, PeriodSnapshotEntity} from '../../database/entities';

/** Read-only, owner-scoped access to immutable monthly snapshots (8.12/11.4). */
@Injectable()
export class PeriodReadRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** Closed snapshots in the inclusive range, newest first. */
  async list(userId: number, from: string, to: string): Promise<PeriodSnapshotEntity[]> {
    return this.dataSource.getRepository(PeriodSnapshotEntity).find({
      where: {userId, period: Between(from, to)},
      order: {period: 'DESC'},
    });
  }

  /** The caller's snapshot and its frozen rows, or null when it is missing or foreign. */
  async findByPeriod(
    userId: number,
    period: string,
  ): Promise<{
    snapshot: PeriodSnapshotEntity;
    balances: AccountPeriodBalanceEntity[];
  } | null> {
    const snapshot = await this.dataSource.getRepository(PeriodSnapshotEntity).findOne({
      where: {userId, period},
    });
    if (!snapshot) {
      return null;
    }

    const balances = await this.dataSource.getRepository(AccountPeriodBalanceEntity).find({
      where: {snapshotId: snapshot.id},
      relations: {account: true},
      order: {accountId: 'ASC'},
    });
    return {snapshot, balances};
  }
}
