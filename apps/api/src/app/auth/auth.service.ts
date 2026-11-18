import {Injectable} from '@nestjs/common';
import {AuthResponseDto} from './dto/auth-response.dto';
import type {RegisterRequestDto} from './dto/register-request.dto';
import {AuthRegistrationRepository} from './services/auth-registration.repository';
import {PasswordHasher} from './services/password-hasher';
import {TokenService} from './services/token-service';
import {normalizeEmail} from './utils/normalize-email.util';

/** Registration use case: validate, hash, persist transactionally and auto-login (D44). */
@Injectable()
export class AuthService {
  constructor(
    private readonly registration: AuthRegistrationRepository,
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
