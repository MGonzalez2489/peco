import {Injectable} from '@nestjs/common';
import {AccountWriteStatusEnum, CategoryApplyTypeEnum, MovementTypeEnum} from '@peco/enums';
import {isLiabilityAccount} from '@peco/utils';
import {DataSource, IsNull, type EntityManager} from 'typeorm';
import {UtcClock} from '../../database/clock/utc-clock';
import {
  AccountEntity,
  CategoryEntity,
  MovementEntity,
  PeriodSnapshotEntity,
  UserEntity,
} from '../../database/entities';
import type {AccountDeletionResult} from '../types/account-deletion-result.type';

/**
 * Serialized account deletion with balance transfer (8.8/9.10/D42/US-305).
 *
 * The user row is locked first, then the involved accounts in ascending `id`
 * order; `READ COMMITTED` keeps the period check and the ledger write atomic.
 */
@Injectable()
export class AccountDeletionRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly clock: UtcClock,
  ) {}

  deleteWithTransfer(
    userId: number,
    sourcePublicId: string,
    destinationPublicId?: string,
  ): Promise<AccountDeletionResult> {
    return this.dataSource.transaction('READ COMMITTED', async (manager) => {
      const user = await manager.findOne(UserEntity, {
        where: {id: userId, deletedAt: IsNull()},
        lock: {mode: 'pessimistic_write'},
      });
      if (!user) {
        return {status: AccountWriteStatusEnum.NOT_FOUND.toString()};
      }

      const sourceLookup = await manager.findOne(AccountEntity, {
        where: {userId, publicId: sourcePublicId, deletedAt: IsNull()},
      });
      if (!sourceLookup) {
        return {status: AccountWriteStatusEnum.NOT_FOUND.toString()};
      }
      if (sourceLookup.isRoot) {
        return {status: AccountWriteStatusEnum.ROOT_PROTECTED.toString()};
      }
      if (destinationPublicId && destinationPublicId === sourcePublicId) {
        return {status: AccountWriteStatusEnum.SELF_TRANSFER.toString()};
      }

      if (sourceLookup.currentBalance !== 0 && !destinationPublicId) {
        return {status: AccountWriteStatusEnum.TRANSFER_REQUIRED.toString()};
      }

      let destinationLookup: AccountEntity | null = null;
      if (sourceLookup.currentBalance !== 0 && destinationPublicId) {
        destinationLookup = await manager.findOne(AccountEntity, {
          where: {userId, publicId: destinationPublicId, deletedAt: IsNull()},
        });
        if (!destinationLookup) {
          return {status: AccountWriteStatusEnum.NOT_FOUND.toString()};
        }
      }

      // Lock both rows in ascending `id` order so concurrent deletions cannot deadlock (9.10).
      const locked = await this.lockAccounts(manager, [
        sourceLookup,
        ...(destinationLookup ? [destinationLookup] : []),
      ]);
      if (!locked) {
        return {status: AccountWriteStatusEnum.NOT_FOUND.toString()};
      }
      const source = locked.find((row) => row.id === sourceLookup.id);
      const destination = destinationLookup
        ? locked.find((row) => row.id === destinationLookup.id) ?? null
        : null;
      if (!source) {
        return {status: AccountWriteStatusEnum.NOT_FOUND.toString()};
      }

      const now = this.clock.now();
      const closed = await manager.findOne(PeriodSnapshotEntity, {
        where: {userId, period: now.slice(0, 7)},
      });
      if (closed) {
        return {status: AccountWriteStatusEnum.PERIOD_CLOSED.toString()};
      }

      let movement: MovementEntity | null = null;
      let movementAccount: AccountEntity | null = null;
      let targetAccount: AccountEntity | null = null;
      let category: CategoryEntity | null = null;

      if (destination && source.currentBalance !== 0) {
        const nextBalance = destination.currentBalance + source.currentBalance;
        if (nextBalance < 0 && !isLiabilityAccount(destination.type)) {
          return {status: AccountWriteStatusEnum.NEGATIVE_BALANCE.toString()};
        }

        category = await this.transferCategory(manager);
        // A positive balance leaves the deleted account; a negative debt is
        // absorbed by it from the destination, keeping `amount` a positive magnitude.
        const from = source.currentBalance > 0 ? source : destination;
        const to = source.currentBalance > 0 ? destination : source;
        movement = manager.create(MovementEntity, {
          userId,
          accountId: from.id,
          targetAccountId: to.id,
          categoryId: category.id,
          type: MovementTypeEnum.TRANSFER.toString(),
          amount: Math.abs(source.currentBalance),
          date: now,
          note: null,
          reversalId: null,
          replacesMovementId: null,
          isReversal: false,
          isReversed: false,
          isCanceled: false,
          scheduledTransactionId: null,
          version: 0,
          deletedAt: null,
        });
        movement = await manager.save(movement);
        movementAccount = from;
        targetAccount = to;

        destination.currentBalance = nextBalance;
        destination.version += 1;
        await manager.save(destination);
      }

      source.currentBalance = 0;
      source.deletedAt = now;
      source.version += 1;
      await manager.save(source);

      return {
        status: AccountWriteStatusEnum.DELETED.toString(),
        source,
        destination,
        movement,
        movementAccount,
        targetAccount,
        category,
      };
    });
  }

  private async lockAccounts(
    manager: EntityManager,
    accounts: AccountEntity[],
  ): Promise<AccountEntity[] | null> {
    const ordered = [...accounts].sort((a, b) => a.id - b.id);
    const locked: AccountEntity[] = [];
    for (const candidate of ordered) {
      const row = await manager.findOne(AccountEntity, {
        where: {id: candidate.id, deletedAt: IsNull()},
        lock: {mode: 'pessimistic_write'},
      });
      if (!row) {
        return null;
      }
      locked.push(row);
    }
    return locked;
  }

  /** Finds or creates the global `Transferencia` row needed by every `TRANSFER` (D96). */
  private async transferCategory(manager: EntityManager): Promise<CategoryEntity> {
    const existing = await manager.findOne(CategoryEntity, {
      where: {userId: IsNull(), name: 'transfer', deletedAt: IsNull()},
    });
    if (existing) {
      return existing;
    }

    const created = manager.create(CategoryEntity, {
      userId: null,
      name: 'transfer',
      displayName: 'Transferencia',
      icon: 'arrow-left-right',
      color: '#6366F1',
      applyType: CategoryApplyTypeEnum.TRANSFER.toString(),
      isRoot: false,
      isSystem: true,
      deletedAt: null,
    });

    return manager.save(created);
  }
}
