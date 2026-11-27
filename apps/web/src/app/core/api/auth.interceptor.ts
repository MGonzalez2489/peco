import {HttpErrorResponse, HttpInterceptorFn, HttpRequest} from '@angular/common/http';
import {inject} from '@angular/core';
import type {AuthResponse} from '@peco/contracts';
import {catchError, finalize, Observable, shareReplay, switchMap, tap, throwError} from 'rxjs';
import {ApiClientError} from '../models/api-client-error.model';
import {AuthTokenStore} from '../stores/auth-token.store';
import {AuthApiService} from './auth-api.service';
import {SKIP_AUTH} from './contexts/skip-auth.context';
import {SKIP_AUTO_REFRESH} from './contexts/skip-auto-refresh.context';

let inFlightRefresh: Observable<AuthResponse> | null = null;

const refreshTokens = (
  api: AuthApiService,
  store: InstanceType<typeof AuthTokenStore>,
  refreshToken: string,
): Observable<AuthResponse> => {
  if (!inFlightRefresh) {
    inFlightRefresh = api.refresh({refreshToken}).pipe(
      tap((auth) => store.setTokens(auth)),
      finalize(() => {
        inFlightRefresh = null;
      }),
      shareReplay({bufferSize: 1, refCount: false}),
    );
  }

  return inFlightRefresh;
};

const withAccessToken = (
  request: HttpRequest<unknown>,
  accessToken: string,
  retried: boolean,
): HttpRequest<unknown> =>
  request.clone({
    setHeaders: {Authorization: `Bearer ${accessToken}`},
    context: retried ? request.context.set(SKIP_AUTO_REFRESH, true) : request.context,
  });

/** Attaches the bearer token and rotates it once when the API rejects it. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const store = inject(AuthTokenStore);
  const authApi = inject(AuthApiService);

  if (request.context.get(SKIP_AUTH)) {
    return next(request);
  }

  const accessToken = store.accessToken();
  const sent = accessToken ? withAccessToken(request, accessToken, false) : request;

  return next(sent).pipe(
    catchError((error: unknown) => {
      const status =
        error instanceof ApiClientError
          ? error.statusCode
          : error instanceof HttpErrorResponse
            ? error.status
            : 0;
      const refreshToken = store.refreshToken();

      if (status !== 401 || request.context.get(SKIP_AUTO_REFRESH) || !refreshToken) {
        return throwError(() => error);
      }

      return refreshTokens(authApi, store, refreshToken).pipe(
        switchMap((auth) => next(withAccessToken(request, auth.accessToken, true))),
        catchError((refreshError: unknown) => {
          store.clear();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
