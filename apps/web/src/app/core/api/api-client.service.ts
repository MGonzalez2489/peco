import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {ApiListSuccess, ApiSingleSuccess} from '@peco/contracts';
import {Observable, map} from 'rxjs';
import {API_BASE_URL} from '../tokens/api-base-url.token';
import {ApiListResult} from '../types/api-list-result.type';

interface RequestOptions {
  query?: object;
  body?: unknown;
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

/** Single HTTP boundary: builds urls, serializes queries and unwraps envelopes once. */
@Injectable({providedIn: 'root'})
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** `/health` sits outside the `/api` global prefix. */
  readonly healthUrl = `${this.baseUrl.replace(/\/api$/, '')}/health`;

  get<T>(path: string, query?: object): Observable<T> {
    return this.request<ApiSingleSuccess<T>>('GET', path, {query}).pipe(
      map((envelope) => envelope.data),
    );
  }

  getList<T, M extends object = object>(
    path: string,
    query?: object,
  ): Observable<ApiListResult<T, M>> {
    return this.request<ApiListSuccess<T, M>>('GET', path, {query}).pipe(
      map(({data, meta}) => ({data, meta})),
    );
  }

  /** For flat responses that are not enveloped, such as `/health`. */
  getRaw<T>(path: string, query?: object): Observable<T> {
    return this.request<T>('GET', path, {query});
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.request<ApiSingleSuccess<T>>('POST', path, {body}).pipe(
      map((envelope) => envelope.data),
    );
  }

  postVoid(path: string, body?: unknown): Observable<void> {
    return this.request<unknown>('POST', path, {body}).pipe(map(() => undefined));
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.request<ApiSingleSuccess<T>>('PATCH', path, {body}).pipe(
      map((envelope) => envelope.data),
    );
  }

  patchVoid(path: string, body: unknown): Observable<void> {
    return this.request<unknown>('PATCH', path, {body}).pipe(map(() => undefined));
  }

  delete<T>(path: string, options?: RequestOptions): Observable<T> {
    return this.request<ApiSingleSuccess<T>>('DELETE', path, options).pipe(
      map((envelope) => envelope.data),
    );
  }

  deleteVoid(path: string, options?: RequestOptions): Observable<void> {
    return this.request<unknown>('DELETE', path, options).pipe(map(() => undefined));
  }

  private request<T>(method: string, path: string, options?: RequestOptions): Observable<T> {
    const url = /^https?:\/\//.test(path)
      ? path
      : `${this.baseUrl}/${path.replace(/^\//, '')}`;

    return this.http.request<T>(method, url, {
      body: options?.body,
      params: toHttpParams(options?.query),
    });
  }
}
