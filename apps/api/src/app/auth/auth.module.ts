import {Module} from '@nestjs/common';
import {JwtModule} from '@nestjs/jwt';
import {APP_GUARD} from '@nestjs/core';
import {ThrottlerModule} from '@nestjs/throttler';
import {ConfigService} from '../config/config.service';
import {DatabaseModule} from '../database/database.module';
import {UtcClock} from '../database/clock/utc-clock';
import {MAIL_SERVICE} from '../mail/constants/mail-service.token';
import {CaptureMailService} from '../mail/services/capture-mail.service';
import {AuthController} from './auth.controller';
import {AuthService} from './auth.service';
import {AccessTokenGuard} from './guards/access-token.guard';
import {AuthRateLimitGuard} from './guards/auth-rate-limit.guard';
import {AuthLoginRepository} from './services/auth-login.repository';
import {AuthLogoutRepository} from './services/auth-logout.repository';
import {AuthPasswordResetRepository} from './services/auth-password-reset.repository';
import {AuthRefreshRepository} from './services/auth-refresh.repository';
import {AuthRegistrationRepository} from './services/auth-registration.repository';
import {PasswordHasher} from './services/password-hasher';
import {UserActivityRepository} from './services/user-activity.repository';
import {TokenService} from './services/token-service';

/** First data-access feature: importing it opens the single TypeORM connection. */
@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({secret: config.config.jwt.accessSecret}),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {name: 'ip', limit: 1, ttl: 60_000},
          {name: 'identity', limit: 1, ttl: 60_000},
        ],
        setHeaders: false,
        skipIf: () => !config.config.rateLimitEnabled,
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRegistrationRepository,
    AuthLoginRepository,
    AuthRefreshRepository,
    AuthLogoutRepository,
    AuthPasswordResetRepository,
    UserActivityRepository,
    PasswordHasher,
    TokenService,
    AuthRateLimitGuard,
    {provide: APP_GUARD, useClass: AccessTokenGuard},
    UtcClock,
    {provide: MAIL_SERVICE, useClass: CaptureMailService},
  ],
})
export class AuthModule {}
