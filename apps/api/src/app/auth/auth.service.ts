import {Injectable} from '@nestjs/common';
import type {UserEntity} from '../database/entities';
import {DUMMY_PASSWORD_HASH} from './constants/dummy-password-hash.constant';
import {AuthResponseDto} from './dto/auth-response.dto';
import type {LoginRequestDto} from './dto/login-request.dto';
import type {RefreshRequestDto} from './dto/refresh-request.dto';
import type {RegisterRequestDto} from './dto/register-request.dto';
import {AuthLoginRepository} from './services/auth-login.repository';
import {AuthRefreshRepository} from './services/auth-refresh.repository';
import {AuthRegistrationRepository} from './services/auth-registration.repository';
import {PasswordHasher} from './services/password-hasher';
import {TokenService} from './services/token-service';
import type {IssuedAccessToken} from './types/issued-access-token.type';
import type {IssuedRefreshToken} from './types/issued-refresh-token.type';
import {invalidCredentialsException} from './utils/invalid-credentials.exception';
import {invalidRefreshTokenException} from './utils/invalid-refresh-token.exception';
import {normalizeEmail} from './utils/normalize-email.util';
import {refreshTokenExpiredException} from './utils/refresh-token-expired.exception';
import {refreshTokenReusedException} from './utils/refresh-token-reused.exception';

/** Registration and login use cases: credentials in, an authenticated response out (D44). */
@Injectable()
export class AuthService {
  constructor(
    private readonly registration: AuthRegistrationRepository,
    private readonly loginRepository: AuthLoginRepository,
    private readonly refreshRepository: AuthRefreshRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async register(request: RegisterRequestDto): Promise<AuthResponseDto> {
    const email = normalizeEmail(request.email);
    const passwordHash = await this.passwordHasher.hash(request.password);
    const refreshToken = this.tokens.createRefreshToken();

    const user = await this.registration.create({
      email,
      passwordHash,
      name: request.name,
      refreshTokenHash: refreshToken.tokenHash,
      refreshExpiresAt: refreshToken.expiresAt,
    });

    const accessToken = await this.tokens.issueAccessToken(user.publicId);

    return this.toAuthResponse(user, accessToken, refreshToken);
  }

  async login(request: LoginRequestDto): Promise<AuthResponseDto> {
    const user = await this.loginRepository.findActiveByEmail(normalizeEmail(request.email));

    // An unknown email still pays for one Argon2id verification: the endpoint
    // cannot be enumerated by timing an absent account against a wrong password.
    const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const passwordMatches = await this.passwordHasher.verify(passwordHash, request.password);
    if (!user || !passwordMatches) {
      throw invalidCredentialsException();
    }

    const refreshToken = this.tokens.createRefreshToken();
    await this.loginRepository.storeRefreshToken(
      user.id,
      refreshToken.tokenHash,
      refreshToken.expiresAt,
    );
    const accessToken = await this.tokens.issueAccessToken(user.publicId);

    return this.toAuthResponse(user, accessToken, refreshToken);
  }

  async refresh(request: RefreshRequestDto): Promise<AuthResponseDto> {
    const refreshToken = this.tokens.createRefreshToken();
    const outcome = await this.refreshRepository.rotate({
      presentedTokenHash: this.tokens.hashRefreshToken(request.refreshToken),
      nextTokenHash: refreshToken.tokenHash,
      nextExpiresAt: refreshToken.expiresAt,
    });

    if (outcome.status === 'invalid') {
      throw invalidRefreshTokenException();
    }
    if (outcome.status === 'expired') {
      throw refreshTokenExpiredException();
    }
    if (outcome.status === 'reused') {
      throw refreshTokenReusedException();
    }

    const accessToken = await this.tokens.issueAccessToken(outcome.user.publicId);
    return this.toAuthResponse(outcome.user, accessToken, refreshToken);
  }

  private toAuthResponse(
    user: UserEntity,
    accessToken: IssuedAccessToken,
    refreshToken: IssuedRefreshToken,
  ): AuthResponseDto {
    return new AuthResponseDto({
      user: {
        publicId: user.publicId,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken: accessToken.token,
      refreshToken: refreshToken.token,
      expiresIn: accessToken.expiresIn,
      refreshExpiresIn: refreshToken.expiresIn,
    });
  }
}
