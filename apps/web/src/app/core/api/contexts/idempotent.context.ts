import {HttpContextToken} from '@angular/common/http';

/** Marks mutations that require the API's `Idempotency-Key` header. */
export const IDEMPOTENT = new HttpContextToken<boolean>(() => false);
