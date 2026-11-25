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
import {MovementProgressionRepository} from './services/movement-progression.repository';
import {MovementProgressionService} from './services/movement-progression.service';

/** Owner-scoped read-only reports built on frozen snapshots or the live ledger (US-801/US-802/US-803). */
@Module({
  imports: [AuthModule, DatabaseModule, PeriodsModule, UsersModule],
  controllers: [ReportsController],
  providers: [
    AccountProgressionRepository,
    AccountProgressionService,
    MovementProgressionRepository,
    MovementProgressionService,
    AccountRepository,
    UtcClock,
  ],
})
export class ReportsModule {}
