import {Injectable, Optional} from '@nestjs/common';
import {JobKeyEnum} from '@peco/enums';
import {DataSource, In, IsNull, MoreThanOrEqual, type EntityManager} from 'typeorm';
import {JobLockService} from '../../../common/job-locks/job-lock.service';
import {AccountEntity, AuditLogEntity, MovementEntity} from '../../../database/entities';
import {movementBalanceImpact} from '../../../movements/utils/movement-balance-impact.util';
import {RECONCILIATION_AUDIT_ENTITY} from '../constants/reconciliation-audit-entity.constant';
import {RECONCILIATION_MISMATCH_AUDIT_ACTION} from '../constants/reconciliation-audit-action.constant';
import {RECONCILIATION_LOCK_NAME} from '../constants/reconciliation-lock-name.constant';
import type {ReconciliationAccount} from '../types/reconciliation-account.type';
import type {ReconciliationDrift} from '../types/reconciliation-drift.type';

/**
 * Read-only ledger scan plus mismatch audit writes. One advisory lock spans the
 * whole run so two API instances never emit duplicate alerts (D50/D58).
 */
@Injectable()
export class ReconciliationRepository {
  constructor(
    private readonly dataSource: DataSource,
    @Optional() private readonly jobLocks?: JobLockService,
  ) {}

  /** Durable lock first, then the advisory lock that existing integration tests assert. */
  async withLock<T>(work: (manager: EntityManager) => Promise<T>): Promise<T | null> {
    const withAdvisoryLock = async (): Promise<T | null> => this.withAdvisoryLock(work);
    return this.jobLocks
      ? this.jobLocks.withLock(JobKeyEnum.RECONCILIATION.toString(), withAdvisoryLock)
      : withAdvisoryLock();
  }

  private async withAdvisoryLock<T>(work: (manager: EntityManager) => Promise<T>): Promise<T | null> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const rows = (await queryRunner.query('SELECT GET_LOCK(?, 0) AS acquired', [
        RECONCILIATION_LOCK_NAME,
      ])) as {acquired: unknown}[];
      if (Number(rows[0]?.acquired) !== 1) {
        return null;
      }

      await queryRunner.startTransaction('READ COMMITTED');
      try {
        const result = await work(queryRunner.manager);
        await queryRunner.commitTransaction();
        return result;
      } catch (error: unknown) {
        await queryRunner.rollbackTransaction();
        throw error;
      }
    } finally {
      await queryRunner.query('SELECT RELEASE_LOCK(?)', [RECONCILIATION_LOCK_NAME]);
      await queryRunner.release();
    }
  }

  /** Active accounts of non-deleted, recently active users (D48/D58). */
  findEligibleAccounts(
    manager: EntityManager,
    activeSince: string,
  ): Promise<ReconciliationAccount[]> {
    return manager.find(AccountEntity, {
      select: {
        id: true,
        publicId: true,
        userId: true,
        initialBalance: true,
        currentBalance: true,
      },
      where: {
        deletedAt: IsNull(),
        user: {
          deletedAt: IsNull(),
          lastActiveAt: MoreThanOrEqual(activeSince),
        },
      },
      order: {id: 'ASC'},
    });
  }

  /** Signed impact of every non-deleted movement touching the given accounts. */
  async readMovementImpacts(
    manager: EntityManager,
    accountIds: number[],
    batchSize: number,
  ): Promise<Map<number, number>> {
    const impacts = new Map<number, number>();
    const wanted = new Set(accountIds);
    let skip = 0;

    for (;;) {
      const movements = await manager.find(MovementEntity, {
        select: {
          id: true,
          type: true,
          amount: true,
          accountId: true,
          targetAccountId: true,
          isCanceled: true,
        },
        where: [
          {deletedAt: IsNull(), accountId: In(accountIds)},
          {deletedAt: IsNull(), targetAccountId: In(accountIds)},
        ],
        order: {id: 'ASC'},
        skip,
        take: batchSize,
      });

      for (const movement of movements) {
        const perAccount = movementBalanceImpact(
          movement.type,
          movement.amount,
          movement.accountId,
          movement.targetAccountId,
          movement.isCanceled,
        );
        for (const [accountId, impact] of perAccount) {
          if (wanted.has(accountId)) {
            impacts.set(accountId, (impacts.get(accountId) ?? 0) + impact);
          }
        }
      }

      if (movements.length < batchSize) {
        break;
      }
      skip += movements.length;
    }

    return impacts;
  }

  /** Appends one audit row per drift; account balances are never touched. */
  async saveDrifts(manager: EntityManager, drifts: ReconciliationDrift[]): Promise<void> {
    if (drifts.length === 0) {
      return;
    }

    const rows = drifts.map((drift) =>
      manager.create(AuditLogEntity, {
        userId: drift.userId,
        entity: RECONCILIATION_AUDIT_ENTITY,
        entityId: drift.accountPublicId,
        action: RECONCILIATION_MISMATCH_AUDIT_ACTION,
        before: {currentBalance: drift.currentBalance},
        after: {
          expectedBalance: drift.expectedBalance,
          delta: drift.delta,
          autoCorrected: false,
        },
      }),
    );

    await manager.save(rows);
  }
}
