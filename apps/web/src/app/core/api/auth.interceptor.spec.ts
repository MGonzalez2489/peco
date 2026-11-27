import {HttpClient} from '@angular/common/http';
import {HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import type {AuthResponse} from '@peco/contracts';
import {AuthTokenStore} from '../stores/auth-token.store';
import {provideApiTesting} from './api-testing.providers';

const BASE_URL = 'https://api.example.com/api';

const authResponse = (accessToken: string): AuthResponse =>
  ({
    user: {publicId: 'user-1'},
    accessToken,
    refreshToken: 'refresh-token',
    expiresIn: 900,
    refreshExpiresIn: 3600,
  }) as unknown as AuthResponse;

const unauthorizedEnvelope = {
  data: null,
  error: {
    statusCode: 401,
    code: 'UNAUTHORIZED',
    message: 'No autorizado.',
    correlationId: 'cid-401',
  },
};

describe('authInterceptor', () => {
  let client: HttpClient;
  let httpTesting: HttpTestingController;
  let store: InstanceType<typeof AuthTokenStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideApiTesting()]});
    client = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuthTokenStore);
  });

  afterEach(() => {
    httpTesting.verify();
    store.clear();
  });

  it('attaches the bearer token to protected requests', () => {
    store.setTokens(authResponse('old-token'));

    client.get(`${BASE_URL}/accounts`).subscribe();
    const request = httpTesting.expectOne(`${BASE_URL}/accounts`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer old-token');
    request.flush({data: [], error: null});
  });

  it('rotates the token once and retries the original request', () => {
    store.setTokens(authResponse('old-token'));
    let result: unknown[] | undefined;

    client.get<unknown[]>(`${BASE_URL}/accounts`).subscribe((value) => (result = value));
    httpTesting.expectOne(`${BASE_URL}/accounts`).flush(unauthorizedEnvelope, {
      status: 401,
      statusText: 'Unauthorized',
    });

    const refresh = httpTesting.expectOne(`${BASE_URL}/auth/refresh`);
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    refresh.flush({data: authResponse('new-token'), error: null});

    const retried = httpTesting.expectOne(`${BASE_URL}/accounts`);
    expect(retried.request.headers.get('Authorization')).toBe('Bearer new-token');
    retried.flush({data: ['ok'], error: null});

    expect(result).toEqual(['ok']);
    expect(store.accessToken()).toBe('new-token');
  });

  it('clears the session when the refresh itself fails', () => {
    store.setTokens(authResponse('old-token'));

    client.get(`${BASE_URL}/accounts`).subscribe({error: () => undefined});
    httpTesting.expectOne(`${BASE_URL}/accounts`).flush(unauthorizedEnvelope, {
      status: 401,
      statusText: 'Unauthorized',
    });

    httpTesting.expectOne(`${BASE_URL}/auth/refresh`).flush(unauthorizedEnvelope, {
      status: 401,
      statusText: 'Unauthorized',
    });

    expect(store.isAuthenticated()).toBe(false);
    expect(store.hasRefreshToken()).toBe(false);
  });
});
