import {Injectable} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {createHash, randomBytes} from 'node:crypto';
import {ConfigService} from '../../config/config.service';
import {UtcClock} from '../../database/clock/utc-clock';
import type {IssuedAccessToken} from '../types/issued-access-token.type';
import type {IssuedRefreshToken} from '../types/issued-refresh-token.type';
import {durationToSeconds} from '../utils/duration-to-seconds.util';

/** Issues access JWTs and opaque, hashed refresh tokens (D22). */
@Injectable()
export class TokenService {
  private readonly accessExpiresIn: number;
  private readonly refreshExpiresIn: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly clock: UtcClock,
  ) {
    this.accessExpiresIn = durationToSeconds(this.configService.config.tokens.access);
    this.refreshExpiresIn = durationToSeconds(this.configService.config.tokens.refresh);
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

  createRefreshToken(): IssuedRefreshToken {
    const token = randomBytes(32).toString('base64url');

    return {
      token,
      tokenHash: this.hashRefreshToken(token),
      expiresAt: this.clock.plusSeconds(this.refreshExpiresIn),
      expiresIn: this.refreshExpiresIn,
    };
  }

  /** Same digest used at creation and at lookup; the raw token never reaches storage. */
  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
