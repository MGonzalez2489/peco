import type {UserEntity} from '../database/entities';
import {AuthService} from './auth.service';
import type {AuthRegistrationRepository} from './services/auth-registration.repository';
import type {PasswordHasher} from './services/password-hasher';
import type {TokenService} from './services/token-service';

const USER = {
  id: 42,
  publicId: 'user-public-id',
  email: 'user@example.com',
  name: 'Manuel',
  createdAt: '2026-11-18T12:00:00.000Z',
  updatedAt: '2026-11-18T12:00:00.000Z',
} as UserEntity;

const REQUEST = {
  email: '  USER@Example.COM  ',
  password: 'correct horse battery',
  name: 'Manuel',
};

describe('AuthService', () => {
  let registration: {create: jest.Mock};
  let hasher: {hash: jest.Mock};
  let tokens: {createRefreshToken: jest.Mock; issueAccessToken: jest.Mock};
  let service: AuthService;

  beforeEach(() => {
    registration = {create: jest.fn().mockResolvedValue(USER)};
    hasher = {hash: jest.fn().mockResolvedValue('argon2-hash')};
    tokens = {
      createRefreshToken: jest.fn().mockReturnValue({
        token: 'raw-refresh-token',
        tokenHash: 'refresh-hash',
        expiresAt: '2026-11-18T12:30:00.000Z',
        expiresIn: 1800,
      }),
      issueAccessToken: jest.fn().mockResolvedValue({token: 'jwt', expiresIn: 900}),
    };

    service = new AuthService(
      registration as unknown as AuthRegistrationRepository,
      hasher as unknown as PasswordHasher,
      tokens as unknown as TokenService,
    );
  });

  it('registers with normalized data and returns an auto-login DTO', async () => {
    const response = await service.register(REQUEST);

    expect(hasher.hash).toHaveBeenCalledWith('correct horse battery');
    expect(registration.create).toHaveBeenCalledWith({
      email: 'user@example.com',
      passwordHash: 'argon2-hash',
      name: 'Manuel',
      refreshTokenHash: 'refresh-hash',
      refreshExpiresAt: '2026-11-18T12:30:00.000Z',
    });
    expect(tokens.issueAccessToken).toHaveBeenCalledWith('user-public-id');
    expect(response).toMatchObject({
      user: {
        publicId: 'user-public-id',
        email: 'user@example.com',
        name: 'Manuel',
        createdAt: USER.createdAt,
        updatedAt: USER.updatedAt,
      },
      accessToken: 'jwt',
      refreshToken: 'raw-refresh-token',
      expiresIn: 900,
      refreshExpiresIn: 1800,
    });
    expect(Object.keys(response)).not.toContain('id');
    expect(Object.keys(response.user)).not.toContain('id');
  });

  it('does not issue tokens when registration fails', async () => {
    const failure = new Error('email taken');
    registration.create.mockRejectedValue(failure);

    await expect(service.register(REQUEST)).rejects.toBe(failure);
    expect(tokens.issueAccessToken).not.toHaveBeenCalled();
  });
});
