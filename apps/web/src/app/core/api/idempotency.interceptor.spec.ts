import {HttpClient, HttpContext, provideHttpClient, withInterceptors} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {IDEMPOTENCY_KEY_HEADER} from '../constants/idempotency-key-header.constant';
import {IDEMPOTENT} from './contexts/idempotent.context';
import {idempotencyInterceptor} from './idempotency.interceptor';

describe('idempotencyInterceptor', () => {
  let client: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([idempotencyInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('leaves plain reads without the header', () => {
    client.get('/api/accounts').subscribe();
    const request = httpTesting.expectOne('/api/accounts');
    expect(request.request.headers.has(IDEMPOTENCY_KEY_HEADER)).toBe(false);
    request.flush({});
  });

  it('adds a valid key only to marked writes and reuses it on retry', () => {
    const context = new HttpContext().set(IDEMPOTENT, true);

    client.post('/api/movements', {}, {context}).subscribe();
    const first = httpTesting.expectOne('/api/movements');
    const key = first.request.headers.get(IDEMPOTENCY_KEY_HEADER);
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    first.flush({});

    client.post('/api/movements', {}, {context}).subscribe();
    const retry = httpTesting.expectOne('/api/movements');
    expect(retry.request.headers.get(IDEMPOTENCY_KEY_HEADER)).toBe(key);
    retry.flush({});
  });
});
