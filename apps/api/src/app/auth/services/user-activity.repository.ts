import {Injectable} from '@nestjs/common';
import {DataSource, IsNull} from 'typeorm';
import {UtcClock} from '../../database/clock/utc-clock';
import {UserEntity} from '../../database/entities';

/**
 * Writes the daily activity signal with one conditional UPDATE (D58, D86).
 * The UTC day start is derived from the same instant as `lastActiveAt`, so a
 * long-inactive user is reactivated on the first authenticated request and no
 * second row is written in the same UTC day.
 */
@Injectable()
export class UserActivityRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly clock: UtcClock,
  ) {}

  /** Returns the timestamp that was stored before today's conditional update. */
  async touch(publicId: string): Promise<string | null> {
    const stored = await this.dataSource.getRepository(UserEntity).findOne({
      where: {publicId, deletedAt: IsNull()},
      select: {lastActiveAt: true},
    });
    const previousLastActiveAt = stored?.lastActiveAt ?? null;
    const now = this.clock.now();
    const startOfUtcDay = `${now.slice(0, 10)}T00:00:00.000Z`;

    await this.dataSource
      .getRepository(UserEntity)
      .createQueryBuilder()
      .update(UserEntity)
      .set({lastActiveAt: now, updatedAt: now})
      .where('publicId = :publicId', {publicId})
      .andWhere('deletedAt IS NULL')
      .andWhere('(lastActiveAt IS NULL OR lastActiveAt < :startOfUtcDay)', {startOfUtcDay})
      .execute();

    return previousLastActiveAt;
  }
}
