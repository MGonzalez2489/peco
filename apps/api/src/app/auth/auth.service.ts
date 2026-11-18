import {Injectable} from '@nestjs/common';
import type {UserEntity} from '../database/entities';
import {DUMMY_PASSWORD_HASH} from './constants/dummy-password-hash.constant';
import {AuthResponseDto} from './dto/auth-response.dto';
import type {LoginRequestDto} from './dto/login-request.dto';
import type {RegisterRequestDto} from './dto/register-request.dto';
import {AuthLoginRepository} from './services/auth-login.repository';
import {AuthRegistrationRepository} from './services/auth-registration.repository';
import {PasswordHasher} from './services/password-hasher';
import {TokenService} from './services/token-service';
import type {IssuedAccessToken} from './types/issued-access-token.type';
import type {IssuedRefreshToken} from './types/issued-refresh-token.type';
import {invalidCredentialsException} from './utils/invalid-credentials.exception';
import {normalizeEmail} from './utils/normalize-email.util';

/** Registration and login use cases: credentials in, an authenticated response out (D44). */
@Injectable()
export class AuthService {
  constructor(
    private readonly registration: AuthRegistrationRepository,
    private readonly loginRepository: AuthLoginRepository,
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
