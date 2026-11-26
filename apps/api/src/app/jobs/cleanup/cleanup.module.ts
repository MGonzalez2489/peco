import {Module} from '@nestjs/common';
import {JobLocksModule} from '../../common/job-locks/job-locks.module';
import {UtcClock} from '../../database/clock/utc-clock';
import {DatabaseModule} from '../../database/database.module';
import {CleanupRepository} from './services/cleanup.repository';
import {CleanupScheduler} from './services/cleanup.scheduler';
import {CleanupService} from './services/cleanup.service';

/** Daily bounded retention sweep (12/US-1003). */
@Module({
  imports: [DatabaseModule, JobLocksModule],
  providers: [UtcClock, CleanupRepository, CleanupService, CleanupScheduler],
  exports: [CleanupService],
})
export class CleanupModule {}
