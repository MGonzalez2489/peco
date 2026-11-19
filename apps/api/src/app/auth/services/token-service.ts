import {Injectable} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {createHash, randomBytes} from 'node:crypto';
import {TokenExpiredError} from 'jsonwebtoken';
import {ConfigService} from '../../config/config.service';
import {UtcClock} from '../../database/clock/utc-clock';
import type {AccessTokenClaims} from '../types/access-token-claims.type';
import type {IssuedAccessToken} from '../types/issued-access-token.type';
import type {IssuedRefreshToken} from '../types/issued-refresh-token.type';
import type {IssuedResetToken} from '../types/issued-reset-token.type';
import {durationToSeconds} from '../utils/duration-to-seconds.util';
import {tokenExpiredException} from '../utils/token-expired.exception';
import {unauthorizedException} from '../utils/unauthorized.exception';

/** Issues and verifies access JWTs and opaque, hashed refresh and reset tokens (D22, D85, D86). */
@Injectable()
export class TokenService {
  private readonly accessExpiresIn: number;
  private readonly refreshExpiresIn: number;
  private readonly resetExpiresIn: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly clock: UtcClock,
  ) {
    this.accessExpiresIn = durationToSeconds(this.configService.config.tokens.access);
    this.refreshExpiresIn = durationToSeconds(this.configService.config.tokens.refresh);
    this.resetExpiresIn = durationToSeconds(this.configService.config.tokens.reset);
  }

  async issueAccessToken(publicId: string): Promise<IssuedAccessToken> {
    const token = await this.jwtService.signAsync(
      {sub: publicId},
      {
        secret: this.configService.config.jwt.accessSecret,
        expiresIn: this.accessExpiresIn,
      },
    );

    return {token, expiresIn: this.accessExpiresIn};
  }

  /** Verifies an access JWT without trusting its payload until it is validated. */
  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    let claims: unknown;

    try {
      claims = await this.jwtService.verifyAsync(token, {
        secret: this.configService.config.jwt.accessSecret,
      });
    } catch (error: unknown) {
      if (error instanceof TokenExpiredError) {
        throw tokenExpiredException();
      }
      throw unauthorizedException();
    }

    if (
      typeof claims !== 'object' ||
      claims === null ||
      typeof (claims as {sub?: unknown}).sub !== 'string' ||
      (claims as {sub: string}).sub.length === 0
    ) {
      throw unauthorizedException();
    }

    return {sub: (claims as {sub: string}).sub};
  }

  createRefreshToken(): IssuedRefreshToken {
    const token = randomBytes(32).toString('base64url');

    return {
      token,
      tokenHash: this.hashRefreshToken(token),
      expiresAt: this.clock.plusSeconds(this.refreshExpiresIn),
      expiresIn: this.refreshExpiresIn,
    };
  }

  /** Single-use reset token delivered by email; only its digest is persisted (D85). */
  createResetToken(): IssuedResetToken {
    const token = randomBytes(32).toString('base64url');

    return {
      token,
      tokenHash: this.hashResetToken(token),
      expiresAt: this.clock.plusSeconds(this.resetExpiresIn),
      expiresIn: this.resetExpiresIn,
    };
  }

  /** Same digest used at creation and at lookup; the raw token never reaches storage. */
  hashRefreshToken(token: string): string {
    return this.digest(token);
  }

  hashResetToken(token: string): string {
    return this.digest(token);
  }

  private digest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
