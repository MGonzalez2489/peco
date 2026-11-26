import {Module} from '@nestjs/common';
import {JobLocksModule} from '../../common/job-locks/job-locks.module';
import {UtcClock} from '../../database/clock/utc-clock';
import {DatabaseModule} from '../../database/database.module';
import {ReconciliationAlertService} from './services/reconciliation-alert.service';
import {ReconciliationMetricsService} from './services/reconciliation-metrics.service';
import {ReconciliationRepository} from './services/reconciliation.repository';
import {ReconciliationScheduler} from './services/reconciliation.scheduler';
import {ReconciliationService} from './services/reconciliation.service';

/** Nightly read-only ledger reconciliation (US-510/D50). */
@Module({
  imports: [DatabaseModule, JobLocksModule],
  providers: [
    UtcClock,
    ReconciliationRepository,
    ReconciliationMetricsService,
    ReconciliationAlertService,
    ReconciliationService,
    ReconciliationScheduler,
  ],
  exports: [ReconciliationService, ReconciliationMetricsService],
})
export class ReconciliationModule {}
