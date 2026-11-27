import {HttpContextToken} from '@angular/common/http';

/** Correlation id generated for the current request and shared by the interceptors. */
export const CORRELATION_ID = new HttpContextToken<string>(() => '');
