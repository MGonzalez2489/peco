import {HttpClient, HttpContext, HttpParams} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable, map} from 'rxjs';
import {API_BASE_URL} from '../tokens/api-base-url.token';
import {ApiListResult} from '../types/api-list-result.type';

interface RequestOptions {
  query?: object;
  body?: unknown;
  context?: HttpContext;
}

const toHttpParams = (query?: object): HttpParams => {
  let params = new HttpParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      params = params.set(key, String(value));
    }
  }

  return params;
};

/** Builds urls and queries only; envelope handling lives in the HTTP interceptor chain. */
@Injectable({providedIn: 'root'})
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** `/health` sits outside the `/api` global prefix. */
  readonly healthUrl = `${this.baseUrl.replace(/\/api$/, '')}/health`;

  get<T>(path: string, query?: object, context?: HttpContext): Observable<T> {
    return this.request<T>('GET', path, {query, context});
  }

  getList<T, M extends object = object>(
    path: string,
    query?: object,
    context?: HttpContext,
  ): Observable<ApiListResult<T, M>> {
    return this.request<ApiListResult<T, M>>('GET', path, {query, context});
  }

  /** For flat responses that are not enveloped, such as `/health`. */
  getRaw<T>(path: string, query?: object, context?: HttpContext): Observable<T> {
    return this.request<T>('GET', path, {query, context});
  }

  post<T>(path: string, body?: unknown, context?: HttpContext): Observable<T> {
    return this.request<T>('POST', path, {body, context});
  }

  postVoid(path: string, body?: unknown, context?: HttpContext): Observable<void> {
    return this.request<void>('POST', path, {body, context}).pipe(map(() => undefined));
  }

  patch<T>(path: string, body: unknown, context?: HttpContext): Observable<T> {
    return this.request<T>('PATCH', path, {body, context});
  }

  patchVoid(path: string, body: unknown, context?: HttpContext): Observable<void> {
    return this.request<void>('PATCH', path, {body, context}).pipe(map(() => undefined));
  }

  delete<T>(path: string, options?: RequestOptions): Observable<T> {
    return this.request<T>('DELETE', path, options);
  }

  deleteVoid(path: string, options?: RequestOptions): Observable<void> {
    return this.request<void>('DELETE', path, options).pipe(map(() => undefined));
  }

  private request<T>(method: string, path: string, options?: RequestOptions): Observable<T> {
    const url = /^https?:\/\//.test(path) ? path : `${this.baseUrl}/${path.replace(/^\//, '')}`;

    return this.http.request<T>(method, url, {
      body: options?.body,
      params: toHttpParams(options?.query),
      context: options?.context,
    });
  }
}
