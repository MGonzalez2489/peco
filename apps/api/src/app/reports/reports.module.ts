import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {PeriodsModule} from '../periods/periods.module';
import {ReportsController} from './reports.controller';

/** Owner-scoped read-only reports built on the existing period projection (US-801). */
@Module({
  imports: [AuthModule, PeriodsModule],
  controllers: [ReportsController],
})
export class ReportsModule {}
