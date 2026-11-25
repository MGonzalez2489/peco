import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {UtcClock} from '../database/clock/utc-clock';
import {DatabaseModule} from '../database/database.module';
import {UsersModule} from '../users/users.module';
import {PeriodsController} from './periods.controller';
import {PeriodClosingRepository} from './services/period-closing.repository';
import {PeriodClosingService} from './services/period-closing.service';
import {PeriodReadRepository} from './services/period-read.repository';
import {PeriodReadService} from './services/period-read.service';
import {PeriodReportService} from './services/period-report.service';

/** Owner-scoped period reads, reports and immutable snapshot projection (US-701/US-703/US-705). */
@Module({
  imports: [DatabaseModule, AuthModule, UsersModule],
  controllers: [PeriodsController],
  providers: [
    UtcClock,
    PeriodClosingRepository,
    PeriodClosingService,
    PeriodReadRepository,
    PeriodReadService,
    PeriodReportService,
  ],
  exports: [PeriodClosingService, PeriodReadService, PeriodReportService],
})
export class PeriodsModule {}
