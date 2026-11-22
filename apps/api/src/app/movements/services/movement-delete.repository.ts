import {Injectable} from '@nestjs/common';
import type {AccountBalanceUpdate} from '@peco/contracts';
import {MovementWriteStatusEnum} from '@peco/enums';
import {isLiabilityAccount} from '@peco/utils';
import {DataSource, IsNull, type EntityManager} from 'typeorm';
import {UtcClock} from '../../database/clock/utc-clock';
import {
  AccountEntity,
  AuditLogEntity,
  CategoryEntity,
  MovementEntity,
  PeriodSnapshotEntity,
  UserEntity,
} from '../../database/entities';
import {DEADLOCK_RETRY_LIMIT} from '../constants/deadlock-retry-limit.constant';
import {MOVEMENT_AUDIT_ENTITY} from '../constants/movement-audit-entity.constant';
import {MOVEMENT_DELETE_AUDIT_ACTION} from '../constants/movement-delete-audit-action.constant';
import type {MovementDeleteResult} from '../types/movement-delete-result.type';
import {isDeadlockError} from '../utils/is-deadlock-error.util';
import {lockOwnerAccounts} from '../utils/lock-owner-accounts.util';
import {movementAuditSnapshot} from '../utils/movement-audit-snapshot.util';
import {movementBalanceImpact} from '../utils/movement-balance-impact.util';

/**
 * Soft delete with inverse balance impact (9.7/US-506). The active user row is
 * locked first, then the affected accounts in ascending `id` order, so the
 * period check, the `−impact` writes and the audit append commit atomically.
 */
@Injectable()
export class MovementDeleteRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly clock: UtcClock,
  ) {}

  async delete(userId: number, publicId: string): Promise<MovementDeleteResult> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.dataSource.transaction('READ COMMITTED', (manager) =>
          this.applyDelete(userId, publicId, manager),
        );
      } catch (error: unknown) {
        if (!isDeadlockError(error) || attempt >= DEADLOCK_RETRY_LIMIT) {
          throw error;
        }
      }
    }
  }

  private async applyDelete(
    userId: number,
    publicId: string,
    manager: EntityManager,
  ): Promise<MovementDeleteResult> {
    // The user row serializes ledger writes against period closing (D60).
    const user = await manager.findOne(UserEntity, {
      where: {id: userId, deletedAt: IsNull()},
      lock: {mode: 'pessimistic_write'},
    });
    if (!user) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    const movement = await manager.findOne(MovementEntity, {
      where: {userId, publicId, deletedAt: IsNull()},
      lock: {mode: 'pessimistic_write'},
    });
    if (!movement) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }
    // Contra entries and reversed originals are immutable; a canceled row is
    // deletable but never moved money (§9.6/§9.8).
    if (movement.isReversal || movement.isReversed) {
      return {status: MovementWriteStatusEnum.LOCKED.toString()};
    }

    const source = await manager.findOne(AccountEntity, {
      where: {id: movement.accountId, deletedAt: IsNull()},
    });
    if (!source) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    const target = movement.targetAccountId
      ? await manager.findOne(AccountEntity, {
          where: {id: movement.targetAccountId, deletedAt: IsNull()},
        })
      : null;
    if (movement.targetAccountId && !target) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    const category = await manager.findOne(CategoryEntity, {
      where: {id: movement.categoryId, deletedAt: IsNull()},
    });
    if (!category) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    const locked = await lockOwnerAccounts(manager, [source, target]);
    if (!locked) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }
    const lockedById = new Map(locked.map((account) => [account.id, account]));

    const closed = await manager.findOne(PeriodSnapshotEntity, {
      where: {userId, period: movement.date.slice(0, 7)},
    });
    if (closed) {
      return {status: MovementWriteStatusEnum.PERIOD_CLOSED.toString()};
    }

    const impact = movement.isCanceled
      ? new Map<number, number>()
      : movementBalanceImpact(
          movement.type,
          movement.amount,
          movement.accountId,
          movement.targetAccountId,
        );

    const balances: AccountBalanceUpdate[] = [];
    for (const [accountId, value] of impact) {
      const account = lockedById.get(accountId);
      if (!account) {
        return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
      }

      const nextBalance = account.currentBalance - value;
      if (nextBalance < 0 && !isLiabilityAccount(account.type)) {
        return {status: MovementWriteStatusEnum.NEGATIVE_BALANCE.toString()};
      }

      account.currentBalance = nextBalance;
      account.version += 1;
      await manager.save(account);
      balances.push({
        accountPublicId: account.publicId,
        currentBalance: account.currentBalance,
        version: account.version,
      });
    }

    const now = this.clock.now();
    movement.deletedAt = now;
    movement.version += 1;
    await manager.save(movement);

    await manager.save(
      manager.create(AuditLogEntity, {
        userId,
        entity: MOVEMENT_AUDIT_ENTITY,
        entityId: movement.publicId,
        action: MOVEMENT_DELETE_AUDIT_ACTION,
        before: movementAuditSnapshot(
          movement,
          source,
          target,
          category,
          movement.version - 1,
        ),
        after: null,
      }),
    );

    return {
      status: MovementWriteStatusEnum.DELETED.toString(),
      deletedPublicId: movement.publicId,
      balances,
    };
  }
}
