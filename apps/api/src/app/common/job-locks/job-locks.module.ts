import {Module} from '@nestjs/common';
import {UtcClock} from '../../database/clock/utc-clock';
import {JobLockService} from './job-lock.service';

/** Shared durable lock used by every scheduled job (12/US-1001). */
@Module({
  providers: [UtcClock, JobLockService],
  exports: [JobLockService],
})
export class JobLocksModule {}
