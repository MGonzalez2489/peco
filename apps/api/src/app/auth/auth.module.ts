import {Module} from '@nestjs/common';
import {JwtModule} from '@nestjs/jwt';
import {ConfigService} from '../config/config.service';
import {DatabaseModule} from '../database/database.module';
import {UtcClock} from '../database/clock/utc-clock';
import {MAIL_SERVICE} from '../mail/constants/mail-service.token';
import {CaptureMailService} from '../mail/services/capture-mail.service';
import {AuthController} from './auth.controller';
import {AuthService} from './auth.service';
import {AuthLoginRepository} from './services/auth-login.repository';
import {AuthLogoutRepository} from './services/auth-logout.repository';
import {AuthPasswordResetRepository} from './services/auth-password-reset.repository';
import {AuthRefreshRepository} from './services/auth-refresh.repository';
import {AuthRegistrationRepository} from './services/auth-registration.repository';
import {PasswordHasher} from './services/password-hasher';
import {TokenService} from './services/token-service';

/** First data-access feature: importing it opens the single TypeORM connection. */
@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({secret: config.config.jwt.accessSecret}),
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
    PasswordHasher,
    TokenService,
    UtcClock,
    {provide: MAIL_SERVICE, useClass: CaptureMailService},
  ],
})
export class AuthModule {}
