import {Injectable} from '@nestjs/common';
import {DataSource, IsNull} from 'typeorm';
import {UtcClock} from '../../database/clock/utc-clock';
import {PasswordResetTokenEntity, RefreshTokenEntity, UserEntity} from '../../database/entities';

/**
 * Owns the reset-token invariants (D85). Issuing locks the user row and marks
 * every earlier token used, so only the newest link works. Consuming locks the
 * same row, then stamps `usedAt`, changes the password hash and revokes all
 * refresh sessions in one transaction, making the token single-use.
 */
@Injectable()
export class AuthPasswordResetRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly clock: UtcClock,
  ) {}

  async issue(userId: number, tokenHash: string, expiresAt: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(UserEntity, {
        where: {id: userId, deletedAt: IsNull()},
        lock: {mode: 'pessimistic_write'},
      });
      if (!user) {
        return;
      }

      const now = this.clock.now();
      await manager.update(
        PasswordResetTokenEntity,
        {userId, usedAt: IsNull()},
        {usedAt: now, updatedAt: now},
      );
      await manager.save(
        manager.create(PasswordResetTokenEntity, {
          userId,
          tokenHash,
          expiresAt,
          usedAt: null,
        }),
      );
    });
  }

  /** Returns false for unknown, used, expired or concurrently consumed tokens. */
  async consume(tokenHash: string, passwordHash: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const presented = await manager.findOne(PasswordResetTokenEntity, {
        where: {tokenHash},
      });
      if (!presented) {
        return false;
      }

      const user = await manager.findOne(UserEntity, {
        where: {id: presented.userId, deletedAt: IsNull()},
        lock: {mode: 'pessimistic_write'},
      });
      if (!user) {
        return false;
      }

      const current = await manager.findOne(PasswordResetTokenEntity, {
        where: {id: presented.id},
        lock: {mode: 'pessimistic_write'},
      });
      const now = this.clock.now();
      if (!current || current.usedAt || current.expiresAt <= now) {
        return false;
      }

      await manager.update(
        PasswordResetTokenEntity,
        {id: current.id, usedAt: IsNull()},
        {usedAt: now, updatedAt: now},
      );
      await manager.update(UserEntity, {id: user.id}, {passwordHash, updatedAt: now});
      await manager.update(
        RefreshTokenEntity,
        {userId: user.id, revokedAt: IsNull()},
        {revokedAt: now, updatedAt: now},
      );

      return true;
    });
  }
}
