import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {PasswordHasher} from '../auth/services/password-hasher';
import {UtcClock} from '../database/clock/utc-clock';
import {DatabaseModule} from '../database/database.module';
import {UserDeletionRepository} from './services/user-deletion.repository';
import {UserPasswordRepository} from './services/user-password.repository';
import {UserProfileRepository} from './services/user-profile.repository';
import {UsersController} from './users.controller';
import {UsersService} from './users.service';

/** User profile feature; AuthModule supplies the access guard and rate limiter (D86/D88). */
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserProfileRepository,
    UserDeletionRepository,
    UserPasswordRepository,
    PasswordHasher,
    UtcClock,
  ],
})
export class UsersModule {}
