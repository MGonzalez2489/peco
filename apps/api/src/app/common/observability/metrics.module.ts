import {Global, Module} from '@nestjs/common';
import {AlertService} from './alert.service';
import {DatabasePoolMetricsService} from './database-pool-metrics.service';
import {MetricsRegistry} from './metrics-registry';
import {MetricsService} from './metrics.service';

/** Process-wide metrics and alert sink shared by HTTP, jobs and domain services (13.2). */
@Global()
@Module({
  providers: [MetricsRegistry, MetricsService, AlertService, DatabasePoolMetricsService],
  exports: [MetricsRegistry, MetricsService, AlertService],
})
export class MetricsModule {}
