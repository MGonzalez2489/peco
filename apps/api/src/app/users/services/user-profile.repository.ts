import {Injectable} from '@nestjs/common';
import {DataSource, IsNull} from 'typeorm';
import {UserEntity} from '../../database/entities';

/** Active-user lookups and exclusive name updates (8.7/D87). */
@Injectable()
export class UserProfileRepository {
  constructor(private readonly dataSource: DataSource) {}

  findActiveByPublicId(publicId: string): Promise<UserEntity | null> {
    return this.dataSource.getRepository(UserEntity).findOne({
      where: {publicId, deletedAt: IsNull()},
    });
  }

  /** Locks the row so a concurrent deletion cannot resurrect a profile. */
  updateName(publicId: string, name: string): Promise<UserEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(UserEntity, {
        where: {publicId, deletedAt: IsNull()},
        lock: {mode: 'pessimistic_write'},
      });
      if (!user) {
        return null;
      }

      user.name = name;
      return manager.save(user);
    });
  }
}
