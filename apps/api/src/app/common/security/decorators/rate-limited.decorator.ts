import {SetMetadata} from '@nestjs/common';
import {RATE_LIMIT_METADATA_KEY} from '../constants/rate-limit-metadata-key.constant';

/** Marks a route as subject to the auth rate limits (13.1, D86). */
export const RateLimited = (): MethodDecorator & ClassDecorator =>
  SetMetadata(RATE_LIMIT_METADATA_KEY, true);
