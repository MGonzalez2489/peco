import {createHash} from 'node:crypto';
import {JwtService} from '@nestjs/jwt';
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
});
