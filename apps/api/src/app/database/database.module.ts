import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {ConfigService} from '../config/config.service';
import {createTypeOrmOptions} from './database.config';

const typeOrmRoot = TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => createTypeOrmOptions(configService.config.database),
});

/**
 * Owns the single TypeORM connection; migrations are applied by a release step.
 * Feature modules import this module when they need repositories, so the HTTP
 * skeleton can still boot while MySQL is unavailable (health returns `503`).
 */
@Module({
  imports: [typeOrmRoot],
  exports: [typeOrmRoot],
})
export class DatabaseModule {}
