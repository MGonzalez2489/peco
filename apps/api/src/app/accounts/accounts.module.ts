import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {UtcClock} from '../database/clock/utc-clock';
import {DatabaseModule} from '../database/database.module';
import {UsersModule} from '../users/users.module';
import {AccountsController} from './accounts.controller';
import {AccountsService} from './accounts.service';
import {AccountDeletionRepository} from './services/account-deletion.repository';
import {AccountRepository} from './services/account.repository';

/** Account reads, detail, metadata updates, pinning and deletion with balance transfer (US-305). */
@Module({
  imports: [DatabaseModule, AuthModule, UsersModule],
  controllers: [AccountsController],
  providers: [AccountsService, AccountRepository, AccountDeletionRepository, UtcClock],
})
export class AccountsModule {}
