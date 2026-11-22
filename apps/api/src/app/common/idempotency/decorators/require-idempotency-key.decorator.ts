import {SetMetadata} from '@nestjs/common';
import {REQUIRE_IDEMPOTENCY_KEY_METADATA_KEY} from '../constants/require-idempotency-key-metadata-key.constant';

/** Requires the `Idempotency-Key` header on a mutation (8.5, D108). */
export const RequireIdempotencyKey = (): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRE_IDEMPOTENCY_KEY_METADATA_KEY, true);
