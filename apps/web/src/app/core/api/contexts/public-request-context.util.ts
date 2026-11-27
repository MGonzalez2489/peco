import {HttpContext} from '@angular/common/http';
import {SKIP_AUTH} from './skip-auth.context';
import {SKIP_AUTO_REFRESH} from './skip-auto-refresh.context';

/** Context for unauthenticated endpoints and the refresh call itself. */
export const publicRequestContext = (): HttpContext =>
  new HttpContext().set(SKIP_AUTH, true).set(SKIP_AUTO_REFRESH, true);
