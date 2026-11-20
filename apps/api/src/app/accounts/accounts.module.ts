import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {DatabaseModule} from '../database/database.module';
import {UsersModule} from '../users/users.module';
import {AccountsController} from './accounts.controller';
import {AccountsService} from './accounts.service';
import {AccountRepository} from './services/account.repository';

/** Account reads; ledger writes and account invariants land in later EP-03 stories. */
@Module({
  imports: [DatabaseModule, AuthModule, UsersModule],
  controllers: [AccountsController],
  providers: [AccountsService, AccountRepository],
})
export class AccountsModule {}
