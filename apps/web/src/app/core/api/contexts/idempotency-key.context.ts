import {HttpContextToken} from '@angular/common/http';

/** Reused idempotency key so an auth retry does not create a second operation. */
export const IDEMPOTENCY_KEY = new HttpContextToken<string>(() => '');
