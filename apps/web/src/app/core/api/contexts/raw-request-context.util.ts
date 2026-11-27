import {HttpContext} from '@angular/common/http';
import {RAW_RESPONSE} from './raw-response.context';
import {publicRequestContext} from './public-request-context.util';

/** Context for flat responses such as the public health probe. */
export const rawRequestContext = (): HttpContext => publicRequestContext().set(RAW_RESPONSE, true);
