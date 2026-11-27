import {InjectionToken} from '@angular/core';
import {DEFAULT_API_RUNTIME_CONFIG} from '../constants/default-api-runtime-config.constant';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => DEFAULT_API_RUNTIME_CONFIG.apiBaseUrl,
});
