import {Module} from '@nestjs/common';
import {DatabaseModule} from '../database/database.module';
import {UtcClock} from '../database/clock/utc-clock';
import {PasswordHasher} from '../auth/services/password-hasher';
import {UserDeletionRepository} from './services/user-deletion.repository';
import {UserProfileRepository} from './services/user-profile.repository';
import {UsersController} from './users.controller';
import {UsersService} from './users.service';

/** User profile feature; the global guard from AuthModule protects both routes. */
@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserProfileRepository,
    UserDeletionRepository,
    PasswordHasher,
    UtcClock,
  ],
})
export class UsersModule {}
