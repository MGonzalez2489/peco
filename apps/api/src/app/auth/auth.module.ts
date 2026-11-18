import {Module} from '@nestjs/common';
import {JwtModule} from '@nestjs/jwt';
import {ConfigService} from '../config/config.service';
import {DatabaseModule} from '../database/database.module';
import {UtcClock} from '../database/clock/utc-clock';
import {AuthController} from './auth.controller';
import {AuthService} from './auth.service';
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
  providers: [AuthService, AuthRegistrationRepository, PasswordHasher, TokenService, UtcClock],
})
export class AuthModule {}
