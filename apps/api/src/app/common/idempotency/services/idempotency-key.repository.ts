import {Injectable} from '@nestjs/common';
import {createHash} from 'node:crypto';
import {DataSource, type EntityManager} from 'typeorm';
import {IdempotencyKeyEntity} from '../../../database/entities';
import {IDEMPOTENCY_LIMITS} from '../constants/idempotency-limits.constant';
import type {StoredIdempotencyBody} from '../types/stored-idempotency-body.type';

/** Locked persistence for the `(userId, key)` idempotency slot (M12, D108). */
@Injectable()
export class IdempotencyKeyRepository {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Serializes the whole check-then-insert sequence with a connection-scoped
   * MySQL advisory lock. `FOR UPDATE` alone cannot block two first-time inserts
   * of the same key under READ COMMITTED (D108). The advisory lock is the only
   * lock held across `work`: slot writes commit immediately so they never hold a
   * user FK lock while the mutation handler opens its own ledger transaction.
   */
  async withLock<T>(
    userId: number,
    key: string,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const lockName = this.lockName(userId, key);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const acquired = await queryRunner.query('SELECT GET_LOCK(?, 30) AS acquired', [lockName]);
      const result = (acquired as {acquired: unknown}[])[0]?.acquired;
      if (Number(result) !== 1) {
        throw new Error(`Could not acquire the idempotency lock: ${String(result)}`);
      }

      return await work(queryRunner.manager);
    } finally {
      await queryRunner.query('SELECT RELEASE_LOCK(?)', [lockName]);
      await queryRunner.release();
    }
  }

  private lockName(userId: number, key: string): string {
    const digest = createHash('sha256').update(`${userId}:${key}`).digest('hex').slice(0, 32);
    return `peco:idem:${digest}`;
  }

  /**
   * Reads the slot owned by the advisory lock from `withLock` (D108). A row lock
   * would add no protection here and would require a transaction spanning the
   * mutation handler, which conflicts with the ledger's own user-row lock.
   */
  findForUpdate(
    manager: EntityManager,
    userId: number,
    key: string,
  ): Promise<IdempotencyKeyEntity | null> {
    return manager.findOne(IdempotencyKeyEntity, {where: {userId, key}});
  }

  async savePending(
    manager: EntityManager,
    existing: IdempotencyKeyEntity | null,
    values: {
      userId: number;
      key: string;
      endpoint: string;
      requestHash: string;
      expiresAt: string;
    },
  ): Promise<IdempotencyKeyEntity> {
    const row =
      existing ??
      manager.create(IdempotencyKeyEntity, {
        userId: values.userId,
        key: values.key,
      });

    row.userId = values.userId;
    row.key = values.key;
    row.endpoint = values.endpoint;
    row.requestHash = values.requestHash;
    row.responseStatus = IDEMPOTENCY_LIMITS.pendingResponseStatus;
    row.responseBody = null;
    row.expiresAt = values.expiresAt;

    return manager.save(row);
  }

  async complete(
    manager: EntityManager,
    row: IdempotencyKeyEntity,
    statusCode: number,
    body: StoredIdempotencyBody,
  ): Promise<void> {
    row.responseStatus = statusCode;
    row.responseBody = body as unknown as Record<string, unknown>;

    await manager.save(row);
  }
}
