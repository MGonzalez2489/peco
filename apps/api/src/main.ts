import {NestFactory} from '@nestjs/core';
import {AppModule} from './app/app.module';
import {configureHttp} from './app/common/http/configure-http';
import {IdempotencyInterceptor} from './app/common/idempotency/interceptors/idempotency.interceptor';
import {JsonLogger} from './app/common/logging/json-logger';
import {MetricsService} from './app/common/observability/metrics.service';
import {configureOpenApi} from './app/common/openapi/configure-open-api';
import {ConfigService} from './app/config/config.service';
import {forceUtcTimezone} from './app/config/force-utc-timezone';

async function bootstrap(): Promise<void> {
  forceUtcTimezone();

  const app = await NestFactory.create(AppModule, {bufferLogs: true, bodyParser: false});
  const config = app.get(ConfigService).config;
  const logger = new JsonLogger(config);
  app.useLogger(logger);

  const {port} = config;
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix, {exclude: ['health']});
  configureHttp(app, {
    logger,
    idempotency: app.get(IdempotencyInterceptor),
    config,
    metrics: app.get(MetricsService),
  });
  configureOpenApi(app);
  await app.listen(port);
  // Set when Nx waits for this server to be ready
  if (process.env.NX_READY_SIGNAL_SOCKET) {
    try {
      // Function keeps TypeScript and bundlers from rewriting or bundling the import
      const load = new Function('s', 'return import(s)') as (
        s: string,
      ) => Promise<{emitReadySignal(server: unknown): boolean}>;
      (await load('@nx/js/ready-signal')).emitReadySignal(app.getHttpServer());
    } catch {
      // @nx/js isn't installed
    }
  }
  logger.log(`Application is running on: http://localhost:${port}/${globalPrefix}`, 'Bootstrap');
}

void bootstrap();
