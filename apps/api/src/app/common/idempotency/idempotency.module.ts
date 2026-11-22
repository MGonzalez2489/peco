import {Global, Module} from '@nestjs/common';
import {DatabaseModule} from '../../database/database.module';
import {UtcClock} from '../../database/clock/utc-clock';
import {UsersModule} from '../../users/users.module';
import {IdempotencyInterceptor} from './interceptors/idempotency.interceptor';
import {IdempotencyKeyRepository} from './services/idempotency-key.repository';
import {IdempotencyService} from './services/idempotency.service';

/** Global idempotency plumbing so `main.ts` can register the interceptor once (D108). */
@Global()
@Module({
  imports: [DatabaseModule, UsersModule],
  providers: [IdempotencyKeyRepository, IdempotencyService, IdempotencyInterceptor, UtcClock],
  exports: [IdempotencyInterceptor, IdempotencyService],
})
export class IdempotencyModule {}
