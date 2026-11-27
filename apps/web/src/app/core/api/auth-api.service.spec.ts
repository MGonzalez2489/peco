import {HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {AuthApiService} from './auth-api.service';
import {provideApiTesting} from './api-testing.providers';

const BASE_URL = 'https://api.example.com/api';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideApiTesting()],
    });
    service = TestBed.inject(AuthApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('logs in and unwraps the auth envelope', () => {
    let accessToken: string | undefined;

    service.login({email: 'user@example.com', password: 'secret'}).subscribe((auth) => {
      accessToken = auth.accessToken;
    });
    httpTesting.expectOne(`${BASE_URL}/auth/login`).flush({
      data: {user: {}, accessToken: 'token', refreshToken: 'refresh', expiresIn: 900},
      error: null,
    });

    expect(accessToken).toBe('token');
  });

  it('posts the refresh token on logout and treats 204 as void', () => {
    let completed = false;

    service.logout({refreshToken: 'refresh'}).subscribe({complete: () => (completed = true)});
    const request = httpTesting.expectOne(`${BASE_URL}/auth/logout`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({refreshToken: 'refresh'});
    request.flush(null, {status: 204, statusText: 'No Content'});

    expect(completed).toBe(true);
  });

  it('posts the forgot-password body without an envelope', () => {
    service.forgotPassword({email: 'user@example.com'}).subscribe();
    const request = httpTesting.expectOne(`${BASE_URL}/auth/forgot-password`);
    expect(request.request.body).toEqual({email: 'user@example.com'});
    request.flush(null, {status: 204, statusText: 'No Content'});
  });
});
