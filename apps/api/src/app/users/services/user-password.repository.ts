import {Injectable} from '@nestjs/common';
import {DataSource, IsNull} from 'typeorm';
import {UtcClock} from '../../database/clock/utc-clock';
import {RefreshTokenEntity, UserEntity} from '../../database/entities';

/**
 * Password changes are atomic with a global logout (D70/D88). The user row is
 * locked first so a concurrent deletion or change cannot resurrect a session.
 */
@Injectable()
export class UserPasswordRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly clock: UtcClock,
  ) {}

  change(publicId: string, passwordHash: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(UserEntity, {
        where: {publicId, deletedAt: IsNull()},
        lock: {mode: 'pessimistic_write'},
      });
      if (!user) {
        return false;
      }

      const now = this.clock.now();
      await manager.update(
        UserEntity,
        {id: user.id, deletedAt: IsNull()},
        {passwordHash, updatedAt: now},
      );
      await manager.update(
        RefreshTokenEntity,
        {userId: user.id, revokedAt: IsNull()},
        {revokedAt: now, updatedAt: now},
      );

      return true;
    });
  }
}
