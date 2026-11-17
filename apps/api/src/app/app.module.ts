import {Module} from '@nestjs/common';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {ConfigModule} from './config/config.module';
import {HealthModule} from './health/health.module';

/**
 * `DatabaseModule` is intentionally not imported yet: the API must boot and
 * answer `/health` with `503` while MySQL is down. The first data-access feature
 * module (US-201+) imports it, which opens the single TypeORM connection.
 */
@Module({
  imports: [ConfigModule, HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
