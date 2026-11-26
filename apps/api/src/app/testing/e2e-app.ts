import type {INestApplication} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {DataSource} from 'typeorm';
import {AppModule} from '../app.module';
import {configureHttp} from '../common/http/configure-http';
import {IdempotencyInterceptor} from '../common/idempotency/interceptors/idempotency.interceptor';
import {JsonLogger} from '../common/logging/json-logger';
import {AutoApplyScheduler} from '../jobs/auto-apply/services/auto-apply.scheduler';
import {CleanupScheduler} from '../jobs/cleanup/services/cleanup.scheduler';
import {PeriodCloseScheduler} from '../jobs/period-close/services/period-close.scheduler';
import {ReconciliationScheduler} from '../jobs/reconciliation/services/reconciliation.scheduler';
import {MetricsService} from '../common/observability/metrics.service';
import type {AppConfig} from '../config/app-config';
import {ConfigService} from '../config/config.service';
import {parseConfig} from '../config/parse-config';
import {UtcClock} from '../database/clock/utc-clock';
import {clearE2eDataSource, setE2eDataSource} from './e2e-data-source';
import {fixedUtcClock} from './fixed-clock';
import type {TestDatabase} from './test-database';

/** HTTP client type produced by Supertest against the in-process Nest server. */
export type HttpApi = ReturnType<typeof request>;

export interface E2eTestApp {
  readonly app: INestApplication;
  readonly http: HttpApi;
  readonly dataSource: DataSource;
  readonly config: AppConfig;
  readonly clock: UtcClock;
}

/**
 * Boots the real HTTP pipeline against one test database. Rate limits and cron
 * ticks are disabled so E2E assertions stay deterministic (14.2/US-1101).
 */
export const createE2eApp = async (
  testDatabase: TestDatabase,
  now: string,
): Promise<E2eTestApp> => {
  const config: AppConfig = {
    ...parseConfig({NODE_ENV: 'test', RATE_LIMIT_ENABLED: 'false'}),
    database: testDatabase.database,
    jobs: {
      autoApplyCron: '0 0 31 2 *',
      periodCloseCron: '0 0 31 2 *',
      reconciliationCron: '0 0 31 2 *',
      cleanupCron: '0 0 31 2 *',
      jobLockTtlSeconds: 300,
    },
  };
  const clock = fixedUtcClock(now);
  setE2eDataSource(testDatabase.dataSource);

  const disabledScheduler = {onModuleInit: () => undefined, onModuleDestroy: () => undefined};

  const moduleRef = await Test.createTestingModule({imports: [AppModule]})
    .overrideProvider(ConfigService)
    .useValue(new ConfigService(config))
    .overrideProvider(UtcClock)
    .useValue(clock)
    .overrideProvider(AutoApplyScheduler)
    .useValue(disabledScheduler)
    .overrideProvider(PeriodCloseScheduler)
    .useValue(disabledScheduler)
    .overrideProvider(ReconciliationScheduler)
    .useValue(disabledScheduler)
    .overrideProvider(CleanupScheduler)
    .useValue(disabledScheduler)
    .compile();

  const app = moduleRef.createNestApplication({bufferLogs: true, bodyParser: false});
  const logger = new JsonLogger(config);
  app.useLogger(logger);
  app.setGlobalPrefix('api', {exclude: ['health']});
  configureHttp(app, {
    logger,
    idempotency: app.get(IdempotencyInterceptor),
    config,
    metrics: app.get(MetricsService),
  });
  await app.init();

  return {
    app,
    http: request(app.getHttpServer()),
    dataSource: app.get<DataSource>(DataSource),
    config,
    clock,
  };
};

/** Releases the test-only DataSource handoff after an E2E suite test. */
export const closeE2eApp = async (e2e: E2eTestApp | undefined): Promise<void> => {
  await e2e?.app.close();
  clearE2eDataSource();
};
