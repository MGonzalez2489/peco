import {HttpContextToken} from '@angular/common/http';

/** Marks requests that must not carry the access token. */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);
