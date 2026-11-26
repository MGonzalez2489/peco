import {Module} from '@nestjs/common';
import {JobLocksModule} from '../../common/job-locks/job-locks.module';
import {UtcClock} from '../../database/clock/utc-clock';
import {DatabaseModule} from '../../database/database.module';
import {ScheduledTransactionsModule} from '../../scheduled-transactions/scheduled-transactions.module';
import {AutoApplyRepository} from './services/auto-apply.repository';
import {AutoApplyScheduler} from './services/auto-apply.scheduler';
import {AutoApplyService} from './services/auto-apply.service';

/** Nightly auto-apply of due schedule occurrences (US-607/D54/D57/D58). */
@Module({
  imports: [DatabaseModule, JobLocksModule, ScheduledTransactionsModule],
  providers: [UtcClock, AutoApplyRepository, AutoApplyService, AutoApplyScheduler],
  exports: [AutoApplyService],
})
export class AutoApplyModule {}
