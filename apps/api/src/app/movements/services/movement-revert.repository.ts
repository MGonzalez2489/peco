import {Injectable} from '@nestjs/common';
import type {AccountBalanceUpdate} from '@peco/contracts';
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
import {MOVEMENT_REVERSAL_AUDIT_ACTION} from '../constants/movement-reversal-audit-action.constant';
import {REVERSAL_NOTE_LABELS} from '../constants/reversal-note-label.constant';
import type {MovementRevertResult} from '../types/movement-revert-result.type';
import {isDeadlockError} from '../utils/is-deadlock-error.util';
import {lockOwnerAccounts} from '../utils/lock-owner-accounts.util';
import {movementAuditSnapshot} from '../utils/movement-audit-snapshot.util';
import {movementBalanceImpact} from '../utils/movement-balance-impact.util';
import {reversalMovementType} from '../utils/reversal-movement-type.util';

/** Relations needed to render both rows through `MovementResponseDto`. */
const MOVEMENT_RELATIONS = {
  account: true,
  targetAccount: true,
  category: true,
  reversalOf: true,
  replacesMovement: true,
  scheduledTransaction: true,
} as const;

/**
 * Reversal as a new contra entry plus an immutable flag on the original (9.6/D33/US-507).
 *
 * The active user row, then the original movement and finally the affected
 * accounts are locked ascending by internal `id`, so the flag, the ledger insert,
 * the balance updates and the audit append commit atomically. The contra mirrors
 * `−impact(original)`, which keeps both rows balance-neutral together.
 */
@Injectable()
export class MovementRevertRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly clock: UtcClock,
  ) {}

  async revert(userId: number, publicId: string): Promise<MovementRevertResult> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.dataSource.transaction('READ COMMITTED', (manager) =>
          this.applyRevert(userId, publicId, manager),
        );
      } catch (error: unknown) {
        if (!isDeadlockError(error) || attempt >= DEADLOCK_RETRY_LIMIT) {
          throw error;
        }
      }
    }
  }

  private async applyRevert(
    userId: number,
    publicId: string,
    manager: EntityManager,
  ): Promise<MovementRevertResult> {
    // The user row serializes ledger writes against period closing (D60).
    const user = await manager.findOne(UserEntity, {
      where: {id: userId, deletedAt: IsNull()},
      lock: {mode: 'pessimistic_write'},
    });
    if (!user) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    const original = await manager.findOne(MovementEntity, {
      where: {userId, publicId, deletedAt: IsNull()},
      lock: {mode: 'pessimistic_write'},
    });
    if (!original) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }
    // Contra entries, reversed originals and canceled rows are immutable (§9.6/§9.8).
    if (original.isReversal || original.isReversed || original.isCanceled) {
      return {status: MovementWriteStatusEnum.LOCKED.toString()};
    }

    const source = await manager.findOne(AccountEntity, {
      where: {id: original.accountId, deletedAt: IsNull()},
    });
    if (!source) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    const target = original.targetAccountId
      ? await manager.findOne(AccountEntity, {
          where: {id: original.targetAccountId, deletedAt: IsNull()},
        })
      : null;
    if (original.targetAccountId && !target) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    const category = await manager.findOne(CategoryEntity, {
      where: {id: original.categoryId, deletedAt: IsNull()},
    });
    if (!category) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    const locked = await lockOwnerAccounts(manager, [source, target]);
    if (!locked) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }
    const lockedById = new Map(locked.map((account) => [account.id, account]));

    // Freezing the original's month would mutate a snapshot, so guide the user
    // to a compensating movement in the current period instead (§9.6).
    const closed = await manager.findOne(PeriodSnapshotEntity, {
      where: {userId, period: original.date.slice(0, 7)},
    });
    if (closed) {
      return {status: MovementWriteStatusEnum.PERIOD_CLOSED.toString()};
    }

    const type = reversalMovementType(original.type);
    const isTransfer = type === MovementTypeEnum.TRANSFER.toString();
    const contraSource = isTransfer ? target : source;
    const contraTarget = isTransfer ? source : null;
    if (!contraSource) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    const impact = movementBalanceImpact(
      type,
      original.amount,
      contraSource.id,
      contraTarget?.id ?? null,
    );
    const balances: AccountBalanceUpdate[] = [];
    for (const [accountId, value] of impact) {
      const account = lockedById.get(accountId);
      if (!account) {
        return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
      }

      const nextBalance = account.currentBalance + value;
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

    // Snapshot the pre-flag state before mutating the entity in place.
    const before = movementAuditSnapshot(
      original,
      source,
      target,
      category,
      original.version,
    );
    const now = this.clock.now();
    original.isReversed = true;
    original.version += 1;
    await manager.save(original);

    const reversal = await manager.save(
      manager.create(MovementEntity, {
        userId,
        accountId: contraSource.id,
        targetAccountId: contraTarget?.id ?? null,
        // A generated mirror reuses the original's category and deliberately
        // skips apply-type validation: the user never chooses this row.
        categoryId: original.categoryId,
        type,
        amount: original.amount,
        date: now,
        note: `Reversión de ${REVERSAL_NOTE_LABELS[original.type]} ${original.publicId}`,
        reversalId: original.id,
        replacesMovementId: null,
        isReversal: true,
        isReversed: false,
        isCanceled: false,
        scheduledTransactionId: null,
        version: 0,
        deletedAt: null,
      }),
    );

    await manager.save(
      manager.create(AuditLogEntity, {
        userId,
        entity: MOVEMENT_AUDIT_ENTITY,
        entityId: original.publicId,
        action: MOVEMENT_REVERSAL_AUDIT_ACTION,
        before,
        after: {
          ...movementAuditSnapshot(original, source, target, category, original.version),
          reversalPublicId: reversal.publicId,
        },
      }),
    );

    const storedOriginal = await manager.findOne(MovementEntity, {
      where: {id: original.id},
      relations: MOVEMENT_RELATIONS,
    });
    const storedReversal = await manager.findOne(MovementEntity, {
      where: {id: reversal.id},
      relations: MOVEMENT_RELATIONS,
    });
    if (!storedOriginal || !storedReversal) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    return {
      status: MovementWriteStatusEnum.REVERTED.toString(),
      original: storedOriginal,
      reversal: storedReversal,
      balances,
    };
  }
}
