import {Module} from '@nestjs/common';
import {UtcClock} from '../../database/clock/utc-clock';
import {DatabaseModule} from '../../database/database.module';
import {PeriodsModule} from '../../periods/periods.module';
import {AutoApplyModule} from '../auto-apply/auto-apply.module';
import {PeriodCloseJobService} from './services/period-close-job.service';
import {PeriodCloseRepository} from './services/period-close.repository';
import {PeriodCloseScheduler} from './services/period-close.scheduler';

/** Daily `00:10` UTC close and idempotent startup sweep (US-704/D59). */
@Module({
  imports: [DatabaseModule, PeriodsModule, AutoApplyModule],
  providers: [UtcClock, PeriodCloseRepository, PeriodCloseJobService, PeriodCloseScheduler],
  exports: [PeriodCloseJobService],
})
export class PeriodCloseModule {}
