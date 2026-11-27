import {HttpContext} from '@angular/common/http';
import {IDEMPOTENT} from './idempotent.context';

/** Context for financial writes that require an idempotency key. */
export const idempotentRequestContext = (): HttpContext => new HttpContext().set(IDEMPOTENT, true);
