import {Logger} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {AppModule} from './app/app.module';
import {configureHttp} from './app/common/http/configure-http';
import {ConfigService} from './app/config/config.service';
import {forceUtcTimezone} from './app/config/force-utc-timezone';

async function bootstrap(): Promise<void> {
  forceUtcTimezone();

  const app = await NestFactory.create(AppModule);
  const {port} = app.get(ConfigService).config;
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix, {exclude: ['health']});
  configureHttp(app);
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
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
}

void bootstrap();
