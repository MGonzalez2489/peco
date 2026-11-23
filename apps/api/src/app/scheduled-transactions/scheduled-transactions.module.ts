import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {DatabaseModule} from '../database/database.module';
import {UsersModule} from '../users/users.module';
import {ScheduledTransactionsController} from './scheduled-transactions.controller';
import {ScheduledTransactionsService} from './scheduled-transactions.service';
import {ScheduledTransactionCreationRepository} from './services/scheduled-transaction-creation.repository';

/** Schedule creation with UTC recurrence grids and owner-scoped references (US-601). */
@Module({
  imports: [DatabaseModule, AuthModule, UsersModule],
  controllers: [ScheduledTransactionsController],
  providers: [ScheduledTransactionsService, ScheduledTransactionCreationRepository],
})
export class ScheduledTransactionsModule {}
