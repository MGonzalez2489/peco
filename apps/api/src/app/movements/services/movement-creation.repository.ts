import {Injectable} from '@nestjs/common';
import type {AccountBalanceUpdate, CreateMovementRequest} from '@peco/contracts';
import {
  CategoryApplyTypeEnum,
  MovementTypeEnum,
  MovementWriteStatusEnum,
} from '@peco/enums';
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
import type {MovementCreationResult} from '../types/movement-creation-result.type';

const MAX_DEADLOCK_RETRIES = 3;

/** Serialized ledger insert with account locks and balance updates (9.3/D49/D60/US-501). */
@Injectable()
export class MovementCreationRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly clock: UtcClock,
  ) {}

  async create(
    userId: number,
    request: CreateMovementRequest,
  ): Promise<MovementCreationResult> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.dataSource.transaction('READ COMMITTED', (manager) =>
          this.insert(userId, request, manager),
        );
      } catch (error: unknown) {
        if (!isDeadlockError(error) || attempt >= MAX_DEADLOCK_RETRIES) {
          throw error;
        }
      }
    }
  }

  private async insert(
    userId: number,
    request: CreateMovementRequest,
    manager: EntityManager,
  ): Promise<MovementCreationResult> {
    // The user row serializes ledger writes against period closing (D60).
    const user = await manager.findOne(UserEntity, {
      where: {id: userId, deletedAt: IsNull()},
      lock: {mode: 'pessimistic_write'},
    });
    if (!user) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    const sourceLookup = await manager.findOne(AccountEntity, {
      where: {userId, publicId: request.accountPublicId, deletedAt: IsNull()},
    });
    if (!sourceLookup) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    let targetLookup: AccountEntity | null = null;
    if (request.type === MovementTypeEnum.TRANSFER.toString()) {
      if (!request.targetAccountPublicId) {
        return {status: MovementWriteStatusEnum.TRANSFER_REQUIRED.toString()};
      }
      if (request.targetAccountPublicId === request.accountPublicId) {
        return {status: MovementWriteStatusEnum.SELF_TRANSFER.toString()};
      }

      targetLookup = await manager.findOne(AccountEntity, {
        where: {userId, publicId: request.targetAccountPublicId, deletedAt: IsNull()},
      });
      if (!targetLookup) {
        return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
      }
    }

    // Locks always follow users → accounts ascending by internal id (D49/D60).
    const locked = await this.lockAccounts(manager, [
      sourceLookup,
      ...(targetLookup ? [targetLookup] : []),
    ]);
    if (!locked) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }
    const source = locked.find((row) => row.id === sourceLookup.id);
    const target = targetLookup ? locked.find((row) => row.id === targetLookup.id) ?? null : null;
    if (!source || (targetLookup && !target)) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    const category = await this.resolveCategory(manager, userId, request);
    if (!category) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }
    if (!acceptsType(category.applyType, request.type)) {
      return {status: MovementWriteStatusEnum.CATEGORY_NOT_COMPATIBLE.toString()};
    }

    const date = request.date ?? this.clock.now();
    const closed = await manager.findOne(PeriodSnapshotEntity, {
      where: {userId, period: date.slice(0, 7)},
    });
    if (closed) {
      return {status: MovementWriteStatusEnum.PERIOD_CLOSED.toString()};
    }

    const sourceDelta =
      request.type === MovementTypeEnum.INCOME.toString() ? request.amount : -request.amount;
    const targetDelta =
      request.type === MovementTypeEnum.TRANSFER.toString() ? request.amount : 0;
    const nextSourceBalance = source.currentBalance + sourceDelta;
    const nextTargetBalance = target ? target.currentBalance + targetDelta : null;

    if (nextSourceBalance < 0 && !isLiabilityAccount(source.type)) {
      return {status: MovementWriteStatusEnum.NEGATIVE_BALANCE.toString()};
    }
    if (
      target &&
      nextTargetBalance !== null &&
      nextTargetBalance < 0 &&
      !isLiabilityAccount(target.type)
    ) {
      return {status: MovementWriteStatusEnum.NEGATIVE_BALANCE.toString()};
    }

    const movement = await manager.save(
      manager.create(MovementEntity, {
        userId,
        accountId: source.id,
        targetAccountId: target?.id ?? null,
        categoryId: category.id,
        type: request.type,
        amount: request.amount,
        date,
        note: request.note ?? null,
        reversalId: null,
        replacesMovementId: null,
        isReversal: false,
        isReversed: false,
        isCanceled: false,
        scheduledTransactionId: null,
        version: 0,
        deletedAt: null,
      }),
    );

    const balances: AccountBalanceUpdate[] = [];
    source.currentBalance = nextSourceBalance;
    source.version += 1;
    await manager.save(source);
    balances.push({
      accountPublicId: source.publicId,
      currentBalance: source.currentBalance,
      version: source.version,
    });

    if (target && nextTargetBalance !== null) {
      target.currentBalance = nextTargetBalance;
      target.version += 1;
      await manager.save(target);
      balances.push({
        accountPublicId: target.publicId,
        currentBalance: target.currentBalance,
        version: target.version,
      });
    }

    return {
      status: MovementWriteStatusEnum.CREATED.toString(),
      movement,
      account: source,
      targetAccount: target,
      category,
      balances,
    };
  }

  private async lockAccounts(
    manager: EntityManager,
    accounts: AccountEntity[],
  ): Promise<AccountEntity[] | null> {
    const locked: AccountEntity[] = [];
    for (const candidate of [...accounts].sort((left, right) => left.id - right.id)) {
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

  private resolveCategory(
    manager: EntityManager,
    userId: number,
    request: CreateMovementRequest,
  ): Promise<CategoryEntity | null> {
    if (request.categoryPublicId) {
      return manager.findOne(CategoryEntity, {
        where: [
          {publicId: request.categoryPublicId, userId: IsNull(), deletedAt: IsNull()},
          {publicId: request.categoryPublicId, userId, deletedAt: IsNull()},
        ],
      });
    }

    // D96 seeds `transfer`; D98 seeds the root `unknown` row used by both directions.
    const name =
      request.type === MovementTypeEnum.TRANSFER.toString() ? 'transfer' : 'unknown';
    return manager.findOne(CategoryEntity, {
      where: {userId: IsNull(), name, deletedAt: IsNull()},
    });
  }
}

const acceptsType = (applyType: CategoryEntity['applyType'], type: CreateMovementRequest['type']): boolean =>
  applyType === CategoryApplyTypeEnum.BOTH.toString() || applyType === type;

const isDeadlockError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as {code?: unknown; errno?: unknown};
  return (
    candidate.code === 'ER_LOCK_DEADLOCK' ||
    candidate.code === '40001' ||
    candidate.errno === 1213
  );
};
