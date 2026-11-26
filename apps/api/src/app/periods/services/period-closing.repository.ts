import {Injectable, Logger, Optional} from '@nestjs/common';
import {AlertRuleEnum, AlertSeverityEnum, ApiErrorCodeEnum} from '@peco/enums';
import {
  Between,
  DataSource,
  IsNull,
  LessThan,
  LessThanOrEqual,
  MoreThanOrEqual,
  Or,
  type EntityManager,
} from 'typeorm';
import {AlertService} from '../../common/observability/alert.service';
import {MetricsService} from '../../common/observability/metrics.service';
import {
  AccountEntity,
  AccountPeriodBalanceEntity,
  MovementEntity,
  PeriodSnapshotEntity,
  UserEntity,
} from '../../database/entities';
import {periodUtcBounds} from '../../movements/utils/period-utc-bounds.util';
import {PERIOD_LEDGER_BATCH_SIZE} from '../constants/period-ledger-batch-size.constant';
import {SNAPSHOT_CHAIN_MISMATCH_CODE} from '../constants/snapshot-chain-mismatch-code.constant';
import type {PeriodCalculation} from '../types/period-calculation.type';
import type {PeriodCloseResult} from '../types/period-close-result.type';
import type {PeriodLedgerMovement} from '../types/period-ledger-movement.type';
import {calculatePeriod} from '../utils/calculate-period.util';
import {previousPeriod} from '../utils/previous-period.util';

/**
 * Serialized, transactional monthly projection (11.4/D60). Every close locks
 * the `users` row first, so a backdated ledger write either lands before the
 * snapshot or is rejected with `409 PERIOD_CLOSED` by the ledger itself.
 */
@Injectable()
export class PeriodClosingRepository {
  private readonly logger = new Logger(PeriodClosingRepository.name);

  constructor(
    private readonly dataSource: DataSource,
    @Optional() private readonly alerts?: AlertService,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  /** Earliest user-registration or non-deleted-movement month (11.4), or null when foreign. */
  async findFirstActivityPeriod(userId: number): Promise<string | null> {
    const user = await this.dataSource.getRepository(UserEntity).findOne({
      where: {id: userId, deletedAt: IsNull()},
    });
    if (!user) {
      return null;
    }

    const oldest = await this.dataSource.getRepository(MovementEntity).findOne({
      where: {userId, deletedAt: IsNull()},
      order: {date: 'ASC'},
    });
    const registration = user.createdAt.slice(0, 7);
    return oldest && oldest.date.slice(0, 7) < registration
      ? oldest.date.slice(0, 7)
      : registration;
  }

  /** All stored periods from `from` onward, used to locate the first gap (11.5). */
  async findClosedPeriods(userId: number, from: string): Promise<string[]> {
    const snapshots = await this.dataSource.getRepository(PeriodSnapshotEntity).find({
      select: {period: true},
      where: {userId, period: MoreThanOrEqual(from)},
      order: {period: 'ASC'},
    });

    return snapshots.map(({period}) => period);
  }

  /** Same ledger projection a close uses, read-only, for months without a snapshot (11.6). */
  async project(userId: number, period: string): Promise<PeriodCalculation> {
    return this.projectWithManager(this.dataSource.manager, userId, period);
  }

  /** Closes one period or replays its immutable snapshot inside one transaction. */
  async close(userId: number, period: string): Promise<PeriodCloseResult> {
    return this.dataSource.transaction('READ COMMITTED', (manager) =>
      this.closeWithManager(userId, period, manager),
    );
  }

  private async closeWithManager(
    userId: number,
    period: string,
    manager: EntityManager,
  ): Promise<PeriodCloseResult> {
    // Serialization point shared with every ledger write (D60/11.9).
    const user = await manager.findOne(UserEntity, {
      where: {id: userId, deletedAt: IsNull()},
      lock: {mode: 'pessimistic_write'},
    });
    if (!user) {
      return {status: ApiErrorCodeEnum.NOT_FOUND.toString()};
    }

    const existing = await manager.findOne(PeriodSnapshotEntity, {where: {userId, period}});
    if (existing) {
      const balances = await manager.find(AccountPeriodBalanceEntity, {
        where: {snapshotId: existing.id},
        relations: {account: true},
        order: {accountId: 'ASC'},
      });
      return {created: false, snapshot: existing, balances};
    }

    const firstActivity = await this.firstActivityWithManager(manager, userId, user.createdAt);
    if (period < firstActivity) {
      return {status: ApiErrorCodeEnum.PERIOD_BEFORE_ACTIVITY.toString()};
    }

    const calculation = await this.projectWithManager(manager, userId, period);
    await this.warnOnChainMismatch(manager, userId, period, calculation.accountBalances);
    const bounds = periodUtcBounds(period);

    const snapshot = await manager.save(
      manager.create(PeriodSnapshotEntity, {
        userId,
        period,
        startDate: bounds.from.slice(0, 10),
        endDate: bounds.to.slice(0, 10),
        globalInitialBalance: calculation.globalInitialBalance,
        globalFinalBalance: calculation.globalFinalBalance,
        totalInflows: calculation.totalInflows,
        totalOutflows: calculation.totalOutflows,
        totalTransfers: calculation.totalTransfers,
        totalTransactionsCount: calculation.totalTransactionsCount,
      }),
    );

    const balances: AccountPeriodBalanceEntity[] = [];
    for (const row of calculation.accountBalances) {
      const balance = await manager.save(
        manager.create(AccountPeriodBalanceEntity, {
          snapshotId: snapshot.id,
          snapshot,
          accountId: row.account.id,
          account: row.account,
          accountName: row.account.name,
          accountType: row.account.type,
          color: row.account.color,
          icon: row.account.icon,
          includeInTotal: row.account.includeInTotal,
          initialBalance: row.openingBalance,
          finalBalance: row.finalBalance,
          totalTransactions: row.totalTransactions,
          totalInflows: row.totalInflows,
          totalOutflows: row.totalOutflows,
          totalTransfers: row.totalTransfers,
        }),
      );
      balances.push(balance);
    }

    return {created: true, snapshot, balances};
  }

  /** Shared read-only projection so a closed month and its ledger path cannot diverge. */
  private async projectWithManager(
    manager: EntityManager,
    userId: number,
    period: string,
  ): Promise<PeriodCalculation> {
    const bounds = periodUtcBounds(period);
    const [accounts, movementsBefore, movementsInPeriod] = await Promise.all([
      manager.find(AccountEntity, {
        where: {
          userId,
          createdAt: LessThanOrEqual(bounds.to),
          deletedAt: Or(IsNull(), MoreThanOrEqual(bounds.from)),
        },
        order: {id: 'ASC'},
      }),
      this.readMovements(manager, userId, {date: LessThan(bounds.from)}),
      this.readMovements(manager, userId, {date: Between(bounds.from, bounds.to)}),
    ]);

    return calculatePeriod(accounts, movementsBefore, movementsInPeriod);
  }

  private async firstActivityWithManager(
    manager: EntityManager,
    userId: number,
    createdAt: string,
  ): Promise<string> {
    const oldest = await manager.findOne(MovementEntity, {
      where: {userId, deletedAt: IsNull()},
      order: {date: 'ASC'},
    });
    const registration = createdAt.slice(0, 7);
    return oldest && oldest.date.slice(0, 7) < registration
      ? oldest.date.slice(0, 7)
      : registration;
  }

  private async readMovements(
    manager: EntityManager,
    userId: number,
    dateCondition: object,
  ): Promise<PeriodLedgerMovement[]> {
    const movements: PeriodLedgerMovement[] = [];
    let skip = 0;

    for (;;) {
      const batch = await manager.find(MovementEntity, {
        where: {userId, deletedAt: IsNull(), ...dateCondition},
        select: {
          id: true,
          date: true,
          type: true,
          amount: true,
          accountId: true,
          targetAccountId: true,
          isCanceled: true,
        },
        order: {id: 'ASC'},
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

  /** Ledger wins; a disagreeing previous snapshot is only reported (11.4). */
  private async warnOnChainMismatch(
    manager: EntityManager,
    userId: number,
    period: string,
    rows: readonly {account: AccountEntity; openingBalance: number}[],
  ): Promise<void> {
    const previous = await manager.findOne(PeriodSnapshotEntity, {
      where: {userId, period: previousPeriod(period)},
    });
    if (!previous) {
      return;
    }

    const previousBalances = await manager.find(AccountPeriodBalanceEntity, {
      where: {snapshotId: previous.id},
    });
    for (const row of rows) {
      const frozen = previousBalances.find((balance) => balance.accountId === row.account.id);
      if (frozen && frozen.finalBalance !== row.openingBalance) {
        const dimensions = {
          code: SNAPSHOT_CHAIN_MISMATCH_CODE,
          period,
          snapshotBalance: frozen.finalBalance,
          ledgerBalance: row.openingBalance,
        } as const;
        this.metrics?.addSnapshotChainMismatch();
        if (this.alerts) {
          this.alerts.raise(
            AlertRuleEnum.SNAPSHOT_CHAIN_MISMATCH.toString(),
            AlertSeverityEnum.PAGE.toString(),
            dimensions,
          );
          continue;
        }
        this.logger.warn({event: 'ALERT', ...dimensions, autoCorrected: false});
      }
    }
  }
}
