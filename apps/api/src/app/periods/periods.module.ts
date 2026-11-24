import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {UtcClock} from '../database/clock/utc-clock';
import {DatabaseModule} from '../database/database.module';
import {UsersModule} from '../users/users.module';
import {PeriodsController} from './periods.controller';
import {PeriodClosingRepository} from './services/period-closing.repository';
import {PeriodClosingService} from './services/period-closing.service';

/** Monthly period closing and immutable snapshot projection (US-701). */
@Module({
  imports: [DatabaseModule, AuthModule, UsersModule],
  controllers: [PeriodsController],
  providers: [UtcClock, PeriodClosingRepository, PeriodClosingService],
  exports: [PeriodClosingService],
})
export class PeriodsModule {}
