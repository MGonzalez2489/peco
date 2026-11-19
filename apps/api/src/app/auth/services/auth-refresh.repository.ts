import {Injectable} from '@nestjs/common';
import {DataSource, IsNull} from 'typeorm';
import {UtcClock} from '../../database/clock/utc-clock';
import {RefreshTokenEntity, UserEntity} from '../../database/entities';
import type {RefreshRotationInput} from '../types/refresh-rotation-input.type';
import type {RefreshRotationOutcome} from '../types/refresh-rotation-outcome.type';

/**
 * Rotates refresh sessions atomically (D22). The user row is locked first so
 * concurrent refreshes of the same token serialize. A replay revokes every
 * active row of that user (the whole family) before reporting the reuse.
 */
@Injectable()
export class AuthRefreshRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly clock: UtcClock,
  ) {}

  rotate(input: RefreshRotationInput): Promise<RefreshRotationOutcome> {
    return this.dataSource.transaction(async (manager) => {
      const presented = await manager.findOne(RefreshTokenEntity, {
        where: {tokenHash: input.presentedTokenHash},
      });
      if (!presented) {
        return {status: 'invalid'};
      }

      // Locking the user first makes the second concurrent refresh wait; the
      // following pessimistic read then sees the rotation committed by the first.
      const user = await manager.findOne(UserEntity, {
        where: {id: presented.userId, deletedAt: IsNull()},
        lock: {mode: 'pessimistic_write'},
      });
      if (!user) {
        return {status: 'invalid'};
      }

      const current = await manager.findOne(RefreshTokenEntity, {
        where: {id: presented.id},
        lock: {mode: 'pessimistic_write'},
      });
      if (!current) {
        return {status: 'invalid'};
      }

      const now = this.clock.now();
      if (current.revokedAt) {
        await manager.update(
          RefreshTokenEntity,
          {userId: current.userId, revokedAt: IsNull()},
          {revokedAt: now},
        );
        return {status: 'reused'};
      }
      if (current.expiresAt <= now) {
        return {status: 'expired'};
      }

      await manager.update(
        RefreshTokenEntity,
        {id: current.id, revokedAt: IsNull()},
        {revokedAt: now},
      );
      await manager.save(
        manager.create(RefreshTokenEntity, {
          userId: current.userId,
          tokenHash: input.nextTokenHash,
          expiresAt: input.nextExpiresAt,
          revokedAt: null,
        }),
      );

      return {status: 'rotated', user};
    });
  }
}
