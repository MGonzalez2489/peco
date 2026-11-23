import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {UtcClock} from '../database/clock/utc-clock';
import {DatabaseModule} from '../database/database.module';
import {UsersModule} from '../users/users.module';
import {ScheduledTransactionsController} from './scheduled-transactions.controller';
import {ScheduledTransactionsService} from './scheduled-transactions.service';
import {ScheduledTransactionCreationRepository} from './services/scheduled-transaction-creation.repository';
import {ScheduledTransactionQueryRepository} from './services/scheduled-transaction-query.repository';
import {ScheduledTransactionUpdateRepository} from './services/scheduled-transaction-update.repository';

/** Schedule creation, period-scoped reads, optimistic edits and toggles (US-601–US-603). */
@Module({
  imports: [DatabaseModule, AuthModule, UsersModule],
  controllers: [ScheduledTransactionsController],
  providers: [
    ScheduledTransactionsService,
    ScheduledTransactionCreationRepository,
    ScheduledTransactionQueryRepository,
    ScheduledTransactionUpdateRepository,
    UtcClock,
  ],
})
export class ScheduledTransactionsModule {}
