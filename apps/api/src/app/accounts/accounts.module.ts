import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {UtcClock} from '../database/clock/utc-clock';
import {DatabaseModule} from '../database/database.module';
import {UsersModule} from '../users/users.module';
import {AccountsController} from './accounts.controller';
import {AccountsService} from './accounts.service';
import {AccountRepository} from './services/account.repository';

/** Account reads, detail, metadata updates and non-root creation; ledger writes land in later stories. */
@Module({
  imports: [DatabaseModule, AuthModule, UsersModule],
  controllers: [AccountsController],
  providers: [AccountsService, AccountRepository, UtcClock],
})
export class AccountsModule {}
