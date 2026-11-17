import {Global, Module} from '@nestjs/common';
import {ConfigService} from './config.service';
import {parseConfig} from './parse-config';

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useFactory: (): ConfigService => new ConfigService(parseConfig()),
    },
  ],
  exports: [ConfigService],
})
export class ConfigModule {}
