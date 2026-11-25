import {Module} from '@nestjs/common';
import {AccountRepository} from '../accounts/services/account.repository';
import {AuthModule} from '../auth/auth.module';
import {UtcClock} from '../database/clock/utc-clock';
import {DatabaseModule} from '../database/database.module';
import {PeriodsModule} from '../periods/periods.module';
import {UsersModule} from '../users/users.module';
import {ReportsController} from './reports.controller';
import {AccountProgressionRepository} from './services/account-progression.repository';
import {AccountProgressionService} from './services/account-progression.service';
import {CategoryDistributionRepository} from './services/category-distribution.repository';
import {CategoryDistributionService} from './services/category-distribution.service';
import {MovementProgressionRepository} from './services/movement-progression.repository';
import {MovementProgressionService} from './services/movement-progression.service';
import {ScheduledCommitmentsRepository} from './services/scheduled-commitments.repository';
import {ScheduledCommitmentsService} from './services/scheduled-commitments.service';

/** Owner-scoped read-only reports built on snapshots, the ledger and schedule grids (US-801–US-805). */
@Module({
  imports: [AuthModule, DatabaseModule, PeriodsModule, UsersModule],
  controllers: [ReportsController],
  providers: [
    AccountProgressionRepository,
    AccountProgressionService,
    MovementProgressionRepository,
    MovementProgressionService,
    CategoryDistributionRepository,
    CategoryDistributionService,
    ScheduledCommitmentsRepository,
    ScheduledCommitmentsService,
    AccountRepository,
    UtcClock,
  ],
})
export class ReportsModule {}
