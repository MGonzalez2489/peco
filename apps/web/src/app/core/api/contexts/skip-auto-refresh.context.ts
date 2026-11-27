import {HttpContextToken} from '@angular/common/http';

/** Prevents a retried request from starting another refresh cycle. */
export const SKIP_AUTO_REFRESH = new HttpContextToken<boolean>(() => false);
