import {Injectable} from '@nestjs/common';
import {DataSource, IsNull} from 'typeorm';
import {RefreshTokenEntity, UserEntity} from '../../database/entities';

/** Login persistence: active-user lookup and new refresh-session storage (D22). */
@Injectable()
export class AuthLoginRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** Soft-deleted users are invisible at query time, not filtered after fetching. */
  findActiveByEmail(email: string): Promise<UserEntity | null> {
    return this.dataSource.getRepository(UserEntity).findOne({
      where: {email, deletedAt: IsNull()},
    });
  }

  async storeRefreshToken(userId: number, tokenHash: string, expiresAt: string): Promise<void> {
    const repository = this.dataSource.getRepository(RefreshTokenEntity);
    await repository.save(
      repository.create({
        userId,
        tokenHash,
        expiresAt,
        revokedAt: null,
      }),
    );
  }
}
