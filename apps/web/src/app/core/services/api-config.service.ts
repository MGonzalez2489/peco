import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable, catchError, map, of, tap} from 'rxjs';
import {DEFAULT_API_RUNTIME_CONFIG} from '../constants/default-api-runtime-config.constant';
import {ApiRuntimeConfig} from '../types/api-runtime-config.type';

const RUNTIME_CONFIG_URL = 'assets/config.json';

/** Normalizes an untrusted runtime payload without ever trusting its shape. */
const normalizeRuntimeConfig = (value: unknown): ApiRuntimeConfig => {
  if (typeof value !== 'object' || value === null) {
    return {...DEFAULT_API_RUNTIME_CONFIG};
  }

  const candidate = value as {apiBaseUrl?: unknown};
  if (typeof candidate.apiBaseUrl !== 'string') {
    return {...DEFAULT_API_RUNTIME_CONFIG};
  }

  const apiBaseUrl = candidate.apiBaseUrl.trim().replace(/\/+$/, '');
  return apiBaseUrl.length > 0 ? {apiBaseUrl} : {...DEFAULT_API_RUNTIME_CONFIG};
};

@Injectable({providedIn: 'root'})
export class ApiConfigService {
  private readonly http = inject(HttpClient);
  private config: ApiRuntimeConfig = {...DEFAULT_API_RUNTIME_CONFIG};

  get apiBaseUrl(): string {
    return this.config.apiBaseUrl;
  }

  load(): Observable<ApiRuntimeConfig> {
    return this.http.get<unknown>(RUNTIME_CONFIG_URL).pipe(
      map((value) => normalizeRuntimeConfig(value)),
      tap((config) => (this.config = config)),
      catchError(() => {
        this.config = {...DEFAULT_API_RUNTIME_CONFIG};
        return of(this.config);
      }),
    );
  }
}
