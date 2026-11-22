import {Injectable} from '@nestjs/common';
import type {AccountBalanceUpdate, UpdateMovementRequest} from '@peco/contracts';
import {MovementTypeEnum, MovementWriteStatusEnum} from '@peco/enums';
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
import {MOVEMENT_EDIT_AUDIT_ACTION} from '../constants/movement-edit-audit-action.constant';
import type {MovementUpdateResult} from '../types/movement-update-result.type';
import {isDeadlockError} from '../utils/is-deadlock-error.util';
import {lockOwnerAccounts} from '../utils/lock-owner-accounts.util';
import {movementAuditSnapshot} from '../utils/movement-audit-snapshot.util';
import {movementCategoryAcceptsType} from '../utils/movement-category-accepts-type.util';

/**
 * Same-type movement edit: one transaction locks the user, the union of old and
 * new accounts, applies `impact(after) − impact(before)` and writes one audit row
 * (9.4/D32/D49/D60/US-504).
 */
@Injectable()
export class MovementUpdateRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly clock: UtcClock,
  ) {}

  async update(
    userId: number,
    publicId: string,
    request: UpdateMovementRequest,
  ): Promise<MovementUpdateResult> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.dataSource.transaction('READ COMMITTED', (manager) =>
          this.applyEdit(userId, publicId, request, manager),
        );
      } catch (error: unknown) {
        if (!isDeadlockError(error) || attempt >= DEADLOCK_RETRY_LIMIT) {
          throw error;
        }
      }
    }
  }

  private async applyEdit(
    userId: number,
    publicId: string,
    request: UpdateMovementRequest,
    manager: EntityManager,
  ): Promise<MovementUpdateResult> {
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
    if (movement.isCanceled || movement.isReversed || movement.isReversal) {
      return {status: MovementWriteStatusEnum.LOCKED.toString()};
    }

    const expectedVersion = request.version ?? movement.version;
    if (request.version !== undefined && movement.version !== request.version) {
      return {
        status: MovementWriteStatusEnum.CONFLICT.toString(),
        expectedVersion,
        currentVersion: movement.version,
      };
    }

    // US-505 owns the atomic replace path; US-504 only handles the same-type edit.
    if (request.type !== undefined && request.type !== movement.type) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }
    const nextType = movement.type;

    const currentSource = await manager.findOne(AccountEntity, {
      where: {id: movement.accountId, deletedAt: IsNull()},
    });
    if (!currentSource) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    const currentTarget = movement.targetAccountId
      ? await manager.findOne(AccountEntity, {
          where: {id: movement.targetAccountId, deletedAt: IsNull()},
        })
      : null;
    if (movement.targetAccountId && !currentTarget) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    const currentCategory = await manager.findOne(CategoryEntity, {
      where: {id: movement.categoryId, deletedAt: IsNull()},
    });
    if (!currentCategory) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    const sourcePublicId = request.accountPublicId ?? currentSource.publicId;
    const targetPublicId =
      nextType === MovementTypeEnum.TRANSFER.toString()
        ? request.targetAccountPublicId ?? currentTarget?.publicId ?? null
        : null;

    if (targetPublicId && targetPublicId === sourcePublicId) {
      return {status: MovementWriteStatusEnum.SELF_TRANSFER.toString()};
    }
    if (nextType === MovementTypeEnum.TRANSFER.toString() && !targetPublicId) {
      return {status: MovementWriteStatusEnum.TRANSFER_REQUIRED.toString()};
    }

    const sourceLookup =
      sourcePublicId === currentSource.publicId
        ? currentSource
        : await manager.findOne(AccountEntity, {
            where: {userId, publicId: sourcePublicId, deletedAt: IsNull()},
          });
    if (!sourceLookup) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    const targetLookup = !targetPublicId
      ? null
      : currentTarget?.publicId === targetPublicId
        ? currentTarget
        : await manager.findOne(AccountEntity, {
            where: {userId, publicId: targetPublicId, deletedAt: IsNull()},
          });
    if (targetPublicId && !targetLookup) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    const category = request.categoryPublicId
      ? await manager.findOne(CategoryEntity, {
          where: [
            {publicId: request.categoryPublicId, userId: IsNull(), deletedAt: IsNull()},
            {publicId: request.categoryPublicId, userId, deletedAt: IsNull()},
          ],
        })
      : currentCategory;
    if (!category) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }
    if (!movementCategoryAcceptsType(category.applyType, nextType)) {
      return {status: MovementWriteStatusEnum.CATEGORY_NOT_COMPATIBLE.toString()};
    }

    const locked = await lockOwnerAccounts(manager, [
      currentSource,
      currentTarget,
      sourceLookup,
      targetLookup,
    ]);
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

    const nextAmount = request.amount ?? movement.amount;
    const nextNote = request.note !== undefined ? request.note : movement.note;
    const before = this.impact(
      movement.type,
      movement.amount,
      movement.accountId,
      movement.targetAccountId,
    );
    const after = this.impact(nextType, nextAmount, sourceLookup.id, targetLookup?.id ?? null);
    const deltas = this.delta(before, after);

    const changedAccounts: AccountEntity[] = [];
    for (const [accountId, delta] of deltas) {
      if (delta === 0) {
        continue;
      }

      const account = lockedById.get(accountId);
      if (!account) {
        return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
      }

      const nextBalance = account.currentBalance + delta;
      if (nextBalance < 0 && !isLiabilityAccount(account.type)) {
        return {status: MovementWriteStatusEnum.NEGATIVE_BALANCE.toString()};
      }

      account.currentBalance = nextBalance;
      account.version += 1;
      changedAccounts.push(account);
    }

    const nextVersion = movement.version + 1;
    const update = manager
      .createQueryBuilder()
      .update(MovementEntity)
      .set({
        accountId: sourceLookup.id,
        targetAccountId: targetLookup?.id ?? null,
        categoryId: category.id,
        amount: nextAmount,
        note: nextNote,
        version: () => '`version` + 1',
        updatedAt: this.clock.now(),
      })
      .where('id = :id', {id: movement.id})
      .andWhere('deletedAt IS NULL')
      .andWhere('version = :expectedVersion', {expectedVersion});

    const result = await update.execute();
    if (result.affected === 0) {
      const current = await manager.findOne(MovementEntity, {
        where: {id: movement.id, deletedAt: IsNull()},
      });

      return {
        status: MovementWriteStatusEnum.CONFLICT.toString(),
        expectedVersion,
        currentVersion: current?.version ?? movement.version,
      };
    }

    const balances: AccountBalanceUpdate[] = [];
    for (const account of changedAccounts) {
      await manager.save(account);
      balances.push({
        accountPublicId: account.publicId,
        currentBalance: account.currentBalance,
        version: account.version,
      });
    }

    await manager.save(
      manager.create(AuditLogEntity, {
        userId,
        entity: MOVEMENT_AUDIT_ENTITY,
        entityId: movement.publicId,
        action: MOVEMENT_EDIT_AUDIT_ACTION,
        before: movementAuditSnapshot(
          movement,
          currentSource,
          currentTarget,
          currentCategory,
          movement.version,
        ),
        after: movementAuditSnapshot(
          {...movement, amount: nextAmount, note: nextNote},
          sourceLookup,
          targetLookup,
          category,
          nextVersion,
        ),
      }),
    );

    const updated = await manager.findOne(MovementEntity, {
      where: {id: movement.id},
      relations: {
        account: true,
        targetAccount: true,
        category: true,
        reversalOf: true,
        replacesMovement: true,
        scheduledTransaction: true,
      },
    });
    if (!updated) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    return {
      status: MovementWriteStatusEnum.UPDATED.toString(),
      movement: updated,
      account: updated.account,
      targetAccount: updated.targetAccount,
      category: updated.category,
      balances,
    };
  }

  private impact(
    type: MovementEntity['type'],
    amount: number,
    sourceId: number,
    targetId: number | null,
  ): Map<number, number> {
    const impact = new Map<number, number>();

    if (type === MovementTypeEnum.INCOME.toString()) {
      impact.set(sourceId, (impact.get(sourceId) ?? 0) + amount);
    } else if (type === MovementTypeEnum.EXPENSE.toString()) {
      impact.set(sourceId, (impact.get(sourceId) ?? 0) - amount);
    } else if (type === MovementTypeEnum.TRANSFER.toString()) {
      impact.set(sourceId, (impact.get(sourceId) ?? 0) - amount);
      if (targetId !== null) {
        impact.set(targetId, (impact.get(targetId) ?? 0) + amount);
      }
    }

    return impact;
  }

  private delta(before: Map<number, number>, after: Map<number, number>): Map<number, number> {
    const deltas = new Map<number, number>();

    for (const [accountId, value] of before) {
      deltas.set(accountId, (deltas.get(accountId) ?? 0) - value);
    }
    for (const [accountId, value] of after) {
      deltas.set(accountId, (deltas.get(accountId) ?? 0) + value);
    }

    return deltas;
  }
}
