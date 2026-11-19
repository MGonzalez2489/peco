import {createHash} from 'node:crypto';
import {JwtService} from '@nestjs/jwt';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import type {ConfigService} from '../../config/config.service';
import type {UtcClock} from '../../database/clock/utc-clock';
import {TokenService} from './token-service';

const ACCESS_SECRET = 'test-access-secret-at-least-32-characters';
const FIXED_EXPIRY = '2026-11-18T12:30:00.000Z';

describe('TokenService', () => {
  const jwtService = new JwtService();
  const clock = {plusSeconds: jest.fn(() => FIXED_EXPIRY)} as unknown as UtcClock;
  const configService = {
    config: {
      jwt: {accessSecret: ACCESS_SECRET},
      tokens: {access: '15m', refresh: '30m', reset: '45m'},
    },
  } as unknown as ConfigService;
  const service = new TokenService(jwtService, configService, clock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signs an access token carrying only the public id and a 900s lifetime', async () => {
    const issued = await service.issueAccessToken('public-id');
    const payload = jwtService.verify<{sub: string; id?: number; exp: number; iat: number}>(
      issued.token,
      {secret: ACCESS_SECRET},
    );

    expect(payload.sub).toBe('public-id');
    expect(payload.id).toBeUndefined();
    expect(payload.exp - payload.iat).toBe(900);
    expect(issued.expiresIn).toBe(900);
  });

  it('creates a hashed refresh token with the configured lifetime', () => {
    const issued = service.createRefreshToken();

    expect(issued.tokenHash).toBe(createHash('sha256').update(issued.token).digest('hex'));
    expect(issued.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(issued.expiresAt).toBe(FIXED_EXPIRY);
    expect(issued.expiresIn).toBe(1800);
    expect(clock.plusSeconds).toHaveBeenCalledWith(1800);
  });

  it('never repeats a refresh token', () => {
    expect(service.createRefreshToken().token).not.toBe(service.createRefreshToken().token);
  });

  it('hashes a presented token with the same digest used at creation', () => {
    const issued = service.createRefreshToken();

    expect(service.hashRefreshToken(issued.token)).toBe(issued.tokenHash);
  });

  it('creates a single-use reset token with the configured lifetime', () => {
    const issued = service.createResetToken();

    expect(issued.tokenHash).toBe(createHash('sha256').update(issued.token).digest('hex'));
    expect(issued.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(issued.expiresAt).toBe(FIXED_EXPIRY);
    expect(issued.expiresIn).toBe(2700);
    expect(clock.plusSeconds).toHaveBeenCalledWith(2700);
  });

  it('never repeats a reset token and hashes it like a refresh token', () => {
    const issued = service.createResetToken();

    expect(service.createResetToken().token).not.toBe(issued.token);
    expect(service.hashResetToken(issued.token)).toBe(issued.tokenHash);
    expect(service.hashResetToken(issued.token)).toBe(service.hashRefreshToken(issued.token));
  });

  describe('verifyAccessToken', () => {
    it('returns only the subject of a valid access token', async () => {
      const issued = await service.issueAccessToken('public-id');

      await expect(service.verifyAccessToken(issued.token)).resolves.toEqual({sub: 'public-id'});
    });

    it('strips extra claims from the verified payload', async () => {
      const token = jwtService.sign(
        {sub: 'public-id', id: 99, role: 'admin'},
        {secret: ACCESS_SECRET, expiresIn: 900},
      );

      await expect(service.verifyAccessToken(token)).resolves.toEqual({sub: 'public-id'});
    });

    it('rejects an expired token with 401 TOKEN_EXPIRED', async () => {
      const token = jwtService.sign({sub: 'public-id'}, {secret: ACCESS_SECRET, expiresIn: -1});

      await expect(service.verifyAccessToken(token)).rejects.toMatchObject({
        code: 'TOKEN_EXPIRED',
        status: 401,
        userMessage: API_ERROR_MESSAGES.TOKEN_EXPIRED,
      });
    });

    it('rejects a malformed token with 401 UNAUTHORIZED', async () => {
      await expect(service.verifyAccessToken('not-a-jwt')).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        status: 401,
        userMessage: API_ERROR_MESSAGES.UNAUTHORIZED,
      });
    });

    it('rejects a token signed with another secret with 401 UNAUTHORIZED', async () => {
      const token = jwtService.sign(
        {sub: 'public-id'},
        {secret: 'another-access-secret-at-least-32-chars', expiresIn: 900},
      );

      await expect(service.verifyAccessToken(token)).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        status: 401,
        userMessage: API_ERROR_MESSAGES.UNAUTHORIZED,
      });
    });

    it.each<Record<string, unknown>>([{}, {sub: 42}, {sub: ''}])(
      'rejects a token with an invalid subject %p',
      async (payload) => {
        const token = jwtService.sign(payload, {secret: ACCESS_SECRET, expiresIn: 900});

        await expect(service.verifyAccessToken(token)).rejects.toMatchObject({
          code: 'UNAUTHORIZED',
          status: 401,
          userMessage: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      },
    );
  });
});
