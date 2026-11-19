import {DataSource, IsNull} from 'typeorm';
import {UtcClock} from '../../database/clock/utc-clock';
import {RefreshTokenEntity} from '../../database/entities';
import {AuthLogoutRepository} from './auth-logout.repository';

const NOW = '2026-11-19T12:00:00.000Z';

describe('AuthLogoutRepository', () => {
  let update: jest.Mock;
  let getRepository: jest.Mock;
  let now: jest.Mock;
  let repository: AuthLogoutRepository;

  beforeEach(() => {
    update = jest.fn().mockResolvedValue({affected: 1});
    getRepository = jest.fn().mockReturnValue({update});
    now = jest.fn().mockReturnValue(NOW);
    repository = new AuthLogoutRepository(
      {getRepository} as unknown as DataSource,
      {now} as unknown as UtcClock,
    );
  });

  it('stamps revokedAt only on the active row matching the token hash', async () => {
    await expect(repository.revoke('presented-hash')).resolves.toBeUndefined();

    expect(getRepository).toHaveBeenCalledWith(RefreshTokenEntity);
    expect(update).toHaveBeenCalledWith(
      {tokenHash: 'presented-hash', revokedAt: IsNull()},
      {revokedAt: NOW},
    );
    expect(now).toHaveBeenCalledTimes(1);
  });

  it('resolves without writing when the hash is unknown or already revoked', async () => {
    update.mockResolvedValue({affected: 0});

    await expect(repository.revoke('stale-hash')).resolves.toBeUndefined();

    expect(update).toHaveBeenCalledTimes(1);
  });
});
