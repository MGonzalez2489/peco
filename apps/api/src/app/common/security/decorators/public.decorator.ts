import {SetMetadata} from '@nestjs/common';
import {PUBLIC_METADATA_KEY} from '../constants/public-metadata-key.constant';

/** Marks a route as reachable without an access token (8.1, D86). */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(PUBLIC_METADATA_KEY, true);
