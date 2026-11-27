import {HttpClient, provideHttpClient, withInterceptors} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {HttpContext} from '@angular/common/http';
import {TestBed} from '@angular/core/testing';
import {ApiErrorCodeEnum} from '@peco/enums';
import {ApiClientError} from '../models/api-client-error.model';
import {RAW_RESPONSE} from './contexts/raw-response.context';
import {envelopeInterceptor} from './envelope.interceptor';

describe('envelopeInterceptor', () => {
  let client: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([envelopeInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('unwraps a single-resource envelope exactly once', () => {
    let result: {publicId: string} | undefined;

    client.get<{publicId: string}>('/api/accounts/one').subscribe((value) => (result = value));
    httpTesting.expectOne('/api/accounts/one').flush({
      data: {publicId: 'one'},
      error: null,
    });

    expect(result).toEqual({publicId: 'one'});
  });

  it('keeps list meta and drops the error field', () => {
    let result: {data: string[]; meta: {count: number}} | undefined;

    client
      .get<{data: string[]; meta: {count: number}}>('/api/categories')
      .subscribe((value) => (result = value));
    httpTesting.expectOne('/api/categories').flush({
      data: ['a'],
      meta: {correlationId: 'cid', count: 1},
      error: null,
    });

    expect(result).toEqual({data: ['a'], meta: {correlationId: 'cid', count: 1}});
  });

  it('normalizes 204 bodies and bypasses raw responses', () => {
    let deleted: unknown = 'pending';
    let health: {status: string} | undefined;

    client.delete('/api/users/me').subscribe((value) => (deleted = value));
    httpTesting.expectOne('/api/users/me').flush(null, {status: 204, statusText: 'No Content'});

    client
      .get<{status: string}>('/health', {
        context: new HttpContext().set(RAW_RESPONSE, true),
      })
      .subscribe((value) => (health = value));
    httpTesting.expectOne('/health').flush({status: 'ok', uptime: 1, db: 'up'});

    expect(deleted).toBeNull();
    expect(health).toEqual({status: 'ok', uptime: 1, db: 'up'});
  });

  it('converts the API error envelope into a typed client error', () => {
    let error: unknown;

    client.get('/api/accounts/one').subscribe({error: (value) => (error = value)});
    httpTesting.expectOne('/api/accounts/one').flush(
      {
        data: null,
        error: {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Datos no válidos.',
          correlationId: 'cid-123',
        },
      },
      {status: 400, statusText: 'Bad Request'},
    );

    expect(error).toBeInstanceOf(ApiClientError);
    const clientError = error as ApiClientError;
    expect(clientError.statusCode).toBe(400);
    expect(clientError.code).toBe(ApiErrorCodeEnum.VALIDATION_ERROR.toString());
    expect(clientError.message).toBe('Datos no válidos.');
    expect(clientError.correlationId).toBe('cid-123');
  });

  it('captures Retry-After as seconds on rate-limit errors', () => {
    let error: unknown;

    client.get('/api/accounts').subscribe({error: (value) => (error = value)});
    httpTesting.expectOne('/api/accounts').flush(
      {
        data: null,
        error: {
          statusCode: 429,
          code: 'RATE_LIMITED',
          message: 'Demasiadas solicitudes.',
          correlationId: 'cid-429',
        },
      },
      {status: 429, statusText: 'Too Many Requests', headers: {'Retry-After': '12'}},
    );

    expect((error as ApiClientError).retryAfterSeconds).toBe(12);
  });
});
