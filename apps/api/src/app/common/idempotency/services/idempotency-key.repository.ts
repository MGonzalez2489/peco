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
   * Serializes the whole check-then-insert sequence. `FOR UPDATE` alone cannot
   * block two first-time inserts of the same key under READ COMMITTED, so a
   * connection-scoped MySQL advisory lock covers that race too (D108).
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

      await queryRunner.startTransaction('READ COMMITTED');
      try {
        const value = await work(queryRunner.manager);
        await queryRunner.commitTransaction();
        return value;
      } catch (error: unknown) {
        await queryRunner.rollbackTransaction();
        throw error;
      }
    } finally {
      await queryRunner.query('SELECT RELEASE_LOCK(?)', [lockName]);
      await queryRunner.release();
    }
  }

  private lockName(userId: number, key: string): string {
    const digest = createHash('sha256').update(`${userId}:${key}`).digest('hex').slice(0, 32);
    return `peco:idem:${digest}`;
  }

  /** Serializes concurrent retries on the same key without locking the user row (D108). */
  findForUpdate(
    manager: EntityManager,
    userId: number,
    key: string,
  ): Promise<IdempotencyKeyEntity | null> {
    return manager.findOne(IdempotencyKeyEntity, {
      where: {userId, key},
      lock: {mode: 'pessimistic_write'},
    });
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
