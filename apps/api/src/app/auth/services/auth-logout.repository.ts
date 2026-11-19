import {Injectable} from '@nestjs/common';
import {DataSource, IsNull} from 'typeorm';
import {UtcClock} from '../../database/clock/utc-clock';
import {RefreshTokenEntity} from '../../database/entities';

/**
 * Revokes a single refresh session (US-204). The conditional update is
 * idempotent: an already revoked or never-issued hash matches no rows, so a
 * repeated logout changes nothing. The timestamp comes from the shared clock.
 */
@Injectable()
export class AuthLogoutRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly clock: UtcClock,
  ) {}

  async revoke(tokenHash: string): Promise<void> {
    await this.dataSource
      .getRepository(RefreshTokenEntity)
      .update({tokenHash, revokedAt: IsNull()}, {revokedAt: this.clock.now()});
  }
}
