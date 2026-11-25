import {Injectable} from '@nestjs/common';
import {
  Between,
  DataSource,
  IsNull,
  LessThan,
  type FindOptionsWhere,
} from 'typeorm';
import {
  AccountEntity,
  AccountPeriodBalanceEntity,
  MovementEntity,
  PeriodSnapshotEntity,
} from '../../database/entities';
import {periodUtcBounds} from '../../movements/utils/period-utc-bounds.util';
import {PERIOD_LEDGER_BATCH_SIZE} from '../../periods/constants/period-ledger-batch-size.constant';
import type {PeriodLedgerMovement} from '../../periods/types/period-ledger-movement.type';
import {movementBalanceImpact} from '../../movements/utils/movement-balance-impact.util';

/**
 * Owner-scoped reads for one account: its frozen monthly row, ledger opening and
 * the month's movements. Canceled rows stay in the result so the shared impact
 * helper excludes them consistently with snapshot projection (US-802/D63).
 */
@Injectable()
export class AccountProgressionRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** Frozen row for the caller's account, or null when no snapshot row exists. */
  async findFrozenBalance(
    userId: number,
    accountId: number,
    period: string,
  ): Promise<AccountPeriodBalanceEntity | null> {
    const snapshot = await this.dataSource.getRepository(PeriodSnapshotEntity).findOne({
      select: {id: true},
      where: {userId, period},
    });
    if (!snapshot) {
      return null;
    }

    return this.dataSource.getRepository(AccountPeriodBalanceEntity).findOne({
      where: {snapshotId: snapshot.id, accountId},
    });
  }

  /** Account initial balance plus every earlier ledger impact, in integer cents. */
  async findOpeningBalance(
    userId: number,
    accountId: number,
    period: string,
  ): Promise<number> {
    const account = await this.dataSource.getRepository(AccountEntity).findOne({
      where: {id: accountId, userId, deletedAt: IsNull()},
      select: {initialBalance: true},
    });
    if (!account) {
      return 0;
    }

    const {from} = periodUtcBounds(period);
    const earlier = await this.readMovements(userId, accountId, {date: LessThan(from)});
    let balance = account.initialBalance;

    for (const movement of earlier) {
      balance +=
        movementBalanceImpact(
          movement.type,
          movement.amount,
          movement.accountId,
          movement.targetAccountId,
          movement.isCanceled,
        ).get(accountId) ?? 0;
    }

    return balance;
  }

  /** Non-deleted movements of the month that touch the account as source or target. */
  findPeriodMovements(
    userId: number,
    accountId: number,
    period: string,
  ): Promise<PeriodLedgerMovement[]> {
    const {from, to} = periodUtcBounds(period);
    return this.readMovements(userId, accountId, {date: Between(from, to)});
  }

  private async readMovements(
    userId: number,
    accountId: number,
    dateCondition: Pick<FindOptionsWhere<MovementEntity>, 'date'>,
  ): Promise<PeriodLedgerMovement[]> {
    const where: FindOptionsWhere<MovementEntity>[] = [
      {userId, accountId, deletedAt: IsNull(), ...dateCondition},
      {userId, targetAccountId: accountId, deletedAt: IsNull(), ...dateCondition},
    ];
    const movements: PeriodLedgerMovement[] = [];
    let skip = 0;

    for (;;) {
      const batch = await this.dataSource.getRepository(MovementEntity).find({
        where,
        select: {
          id: true,
          date: true,
          type: true,
          amount: true,
          accountId: true,
          targetAccountId: true,
          isCanceled: true,
        },
        order: {date: 'ASC', id: 'ASC'},
        take: PERIOD_LEDGER_BATCH_SIZE,
        skip,
      });
      movements.push(...batch);
      if (batch.length < PERIOD_LEDGER_BATCH_SIZE) {
        return movements;
      }
      skip += batch.length;
    }
  }
}
