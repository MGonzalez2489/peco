import {Module} from '@nestjs/common';
import {AccountsModule} from './accounts/accounts.module';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {AuthModule} from './auth/auth.module';
import {CategoriesModule} from './categories/categories.module';
import {IdempotencyModule} from './common/idempotency/idempotency.module';
import {ConfigModule} from './config/config.module';
import {HealthModule} from './health/health.module';
import {AutoApplyModule} from './jobs/auto-apply/auto-apply.module';
import {PeriodCloseModule} from './jobs/period-close/period-close.module';
import {ReconciliationModule} from './jobs/reconciliation/reconciliation.module';
import {MovementsModule} from './movements/movements.module';
import {PeriodsModule} from './periods/periods.module';
import {ScheduledTransactionsModule} from './scheduled-transactions/scheduled-transactions.module';
import {UsersModule} from './users/users.module';

/**
 * `AuthModule` imports `DatabaseModule`, so the first data-access feature opens
 * the single TypeORM connection. The root scaffold can still boot and answer
 * `/health` with `503` while MySQL is down.
 */
@Module({
  imports: [
    ConfigModule,
    IdempotencyModule,
    HealthModule,
    AuthModule,
    UsersModule,
    AccountsModule,
    CategoriesModule,
    MovementsModule,
    ScheduledTransactionsModule,
    PeriodsModule,
    AutoApplyModule,
    PeriodCloseModule,
    ReconciliationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
