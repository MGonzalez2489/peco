import {HttpStatus} from '@nestjs/common';
import {RefreshRotationStatusEnum} from '@peco/enums';
import type {UserEntity} from '../database/entities';
import type {ApiException} from '../common/http/api-exception';
import {API_ERROR_MESSAGES} from '../common/http/api-error-messages.constant';
import {DUMMY_PASSWORD_HASH} from './constants/dummy-password-hash.constant';
import {AuthService} from './auth.service';
import type {AuthLoginRepository} from './services/auth-login.repository';
import type {AuthRefreshRepository} from './services/auth-refresh.repository';
import type {AuthRegistrationRepository} from './services/auth-registration.repository';
import type {PasswordHasher} from './services/password-hasher';
import type {TokenService} from './services/token-service';

const USER = {
  id: 42,
  publicId: 'user-public-id',
  email: 'user@example.com',
  passwordHash: 'argon2-hash',
  name: 'Manuel',
  createdAt: '2026-11-18T12:00:00.000Z',
  updatedAt: '2026-11-18T12:00:00.000Z',
} as UserEntity;

const REGISTER_REQUEST = {
  email: '  USER@Example.COM  ',
  password: 'correct horse battery',
  name: 'Manuel',
};

const LOGIN_REQUEST = {email: '  USER@Example.COM  ', password: 'correct horse battery'};

const publicFailure = (error: unknown) => {
  const exception = error as ApiException;
  return {
    code: exception.code,
    status: exception.getStatus(),
    message: exception.userMessage,
  };
};

describe('AuthService', () => {
  let registration: {create: jest.Mock};
  let loginRepository: {findActiveByEmail: jest.Mock; storeRefreshToken: jest.Mock};
  let refreshRepository: {rotate: jest.Mock};
  let hasher: {hash: jest.Mock; verify: jest.Mock};
  let tokens: {
    createRefreshToken: jest.Mock;
    hashRefreshToken: jest.Mock;
    issueAccessToken: jest.Mock;
  };
  let service: AuthService;

  beforeEach(() => {
    registration = {create: jest.fn().mockResolvedValue(USER)};
    loginRepository = {
      findActiveByEmail: jest.fn().mockResolvedValue(USER),
      storeRefreshToken: jest.fn().mockResolvedValue(undefined),
    };
    refreshRepository = {
      rotate: jest
        .fn()
        .mockResolvedValue({status: RefreshRotationStatusEnum.ROTATED.toString(), user: USER}),
    };
    hasher = {
      hash: jest.fn().mockResolvedValue('argon2-hash'),
      verify: jest.fn().mockResolvedValue(true),
    };
    tokens = {
      createRefreshToken: jest.fn().mockReturnValue({
        token: 'raw-refresh-token',
        tokenHash: 'refresh-hash',
        expiresAt: '2026-11-18T12:30:00.000Z',
        expiresIn: 1800,
      }),
      hashRefreshToken: jest.fn().mockReturnValue('presented-hash'),
      issueAccessToken: jest.fn().mockResolvedValue({token: 'jwt', expiresIn: 900}),
    };

    service = new AuthService(
      registration as unknown as AuthRegistrationRepository,
      loginRepository as unknown as AuthLoginRepository,
      refreshRepository as unknown as AuthRefreshRepository,
      hasher as unknown as PasswordHasher,
      tokens as unknown as TokenService,
    );
  });

  it('registers with normalized data and returns an auto-login DTO', async () => {
    const response = await service.register(REGISTER_REQUEST);

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

    await expect(service.register(REGISTER_REQUEST)).rejects.toBe(failure);
    expect(tokens.issueAccessToken).not.toHaveBeenCalled();
  });

  it('logs in with a normalized email and returns the same auto-login DTO', async () => {
    const response = await service.login(LOGIN_REQUEST);

    expect(loginRepository.findActiveByEmail).toHaveBeenCalledWith('user@example.com');
    expect(hasher.verify).toHaveBeenCalledWith('argon2-hash', 'correct horse battery');
    expect(loginRepository.storeRefreshToken).toHaveBeenCalledWith(
      USER.id,
      'refresh-hash',
      '2026-11-18T12:30:00.000Z',
    );
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

  it('rejects an unknown email with 401, still verifies a hash and issues nothing', async () => {
    loginRepository.findActiveByEmail.mockResolvedValue(null);

    const failure = await service.login(LOGIN_REQUEST).catch((error: unknown) => error);

    expect(hasher.verify).toHaveBeenCalledWith(DUMMY_PASSWORD_HASH, 'correct horse battery');
    expect(publicFailure(failure)).toEqual({
      code: 'INVALID_CREDENTIALS',
      status: HttpStatus.UNAUTHORIZED,
      message: API_ERROR_MESSAGES.INVALID_CREDENTIALS,
    });
    expect(loginRepository.storeRefreshToken).not.toHaveBeenCalled();
    expect(tokens.createRefreshToken).not.toHaveBeenCalled();
    expect(tokens.issueAccessToken).not.toHaveBeenCalled();
  });

  it('rejects a wrong password with 401 and issues nothing', async () => {
    hasher.verify.mockResolvedValue(false);

    const failure = await service.login(LOGIN_REQUEST).catch((error: unknown) => error);

    expect(hasher.verify).toHaveBeenCalledWith('argon2-hash', 'correct horse battery');
    expect(publicFailure(failure)).toEqual({
      code: 'INVALID_CREDENTIALS',
      status: HttpStatus.UNAUTHORIZED,
      message: API_ERROR_MESSAGES.INVALID_CREDENTIALS,
    });
    expect(loginRepository.storeRefreshToken).not.toHaveBeenCalled();
    expect(tokens.issueAccessToken).not.toHaveBeenCalled();
  });

  it('returns an indistinguishable failure for an unknown email and a wrong password', async () => {
    loginRepository.findActiveByEmail.mockResolvedValue(null);
    const unknownEmail = await service.login(LOGIN_REQUEST).catch((error: unknown) => error);

    loginRepository.findActiveByEmail.mockResolvedValue(USER);
    hasher.verify.mockResolvedValue(false);
    const wrongPassword = await service.login(LOGIN_REQUEST).catch((error: unknown) => error);

    expect(publicFailure(unknownEmail)).toEqual(publicFailure(wrongPassword));
  });

  describe('refresh (US-203)', () => {
    const REFRESH_REQUEST = {refreshToken: 'raw-refresh-token'};

    it('rotates the token and returns the same auto-login DTO', async () => {
      const response = await service.refresh(REFRESH_REQUEST);

      expect(tokens.hashRefreshToken).toHaveBeenCalledWith('raw-refresh-token');
      expect(refreshRepository.rotate).toHaveBeenCalledWith({
        presentedTokenHash: 'presented-hash',
        nextTokenHash: 'refresh-hash',
        nextExpiresAt: '2026-11-18T12:30:00.000Z',
      });
      expect(tokens.issueAccessToken).toHaveBeenCalledWith('user-public-id');
      expect(response).toMatchObject({
        user: {publicId: 'user-public-id', email: 'user@example.com'},
        accessToken: 'jwt',
        refreshToken: 'raw-refresh-token',
        expiresIn: 900,
        refreshExpiresIn: 1800,
      });
    });

    it('rejects an unknown token with 401 UNAUTHORIZED and issues nothing', async () => {
      refreshRepository.rotate.mockResolvedValue({
        status: RefreshRotationStatusEnum.INVALID.toString(),
      });

      const failure = await service.refresh(REFRESH_REQUEST).catch((error: unknown) => error);

      expect(publicFailure(failure)).toEqual({
        code: 'UNAUTHORIZED',
        status: HttpStatus.UNAUTHORIZED,
        message: API_ERROR_MESSAGES.UNAUTHORIZED,
      });
      expect(tokens.issueAccessToken).not.toHaveBeenCalled();
    });

    it('rejects an expired token with 401 REFRESH_TOKEN_EXPIRED', async () => {
      refreshRepository.rotate.mockResolvedValue({
        status: RefreshRotationStatusEnum.EXPIRED.toString(),
      });

      const failure = await service.refresh(REFRESH_REQUEST).catch((error: unknown) => error);

      expect(publicFailure(failure)).toEqual({
        code: 'REFRESH_TOKEN_EXPIRED',
        status: HttpStatus.UNAUTHORIZED,
        message: API_ERROR_MESSAGES.REFRESH_TOKEN_EXPIRED,
      });
      expect(tokens.issueAccessToken).not.toHaveBeenCalled();
    });

    it('rejects a replayed token with 401 REFRESH_TOKEN_REUSED', async () => {
      refreshRepository.rotate.mockResolvedValue({
        status: RefreshRotationStatusEnum.REUSED.toString(),
      });

      const failure = await service.refresh(REFRESH_REQUEST).catch((error: unknown) => error);

      expect(publicFailure(failure)).toEqual({
        code: 'REFRESH_TOKEN_REUSED',
        status: HttpStatus.UNAUTHORIZED,
        message: API_ERROR_MESSAGES.REFRESH_TOKEN_REUSED,
      });
      expect(tokens.issueAccessToken).not.toHaveBeenCalled();
    });
  });
});
