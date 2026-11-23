import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {UtcClock} from '../database/clock/utc-clock';
import {DatabaseModule} from '../database/database.module';
import {MovementsModule} from '../movements/movements.module';
import {UsersModule} from '../users/users.module';
import {ScheduledTransactionsController} from './scheduled-transactions.controller';
import {ScheduledTransactionsService} from './scheduled-transactions.service';
import {ScheduledExecutionRepository} from './services/scheduled-execution.repository';
import {ScheduledTransactionCreationRepository} from './services/scheduled-transaction-creation.repository';
import {ScheduledTransactionQueryRepository} from './services/scheduled-transaction-query.repository';
import {ScheduledTransactionUpdateRepository} from './services/scheduled-transaction-update.repository';

/** Schedule creation, reads, edits, toggles and single-occurrence execution (US-601–US-604). */
@Module({
  imports: [DatabaseModule, AuthModule, UsersModule, MovementsModule],
  controllers: [ScheduledTransactionsController],
  providers: [
    ScheduledTransactionsService,
    ScheduledTransactionCreationRepository,
    ScheduledTransactionQueryRepository,
    ScheduledTransactionUpdateRepository,
    ScheduledExecutionRepository,
    UtcClock,
  ],
})
export class ScheduledTransactionsModule {}
