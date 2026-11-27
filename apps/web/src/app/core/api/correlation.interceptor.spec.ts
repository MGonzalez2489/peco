import {HttpClient, HttpContext, provideHttpClient, withInterceptors} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {CORRELATION_ID_HEADER} from '../constants/correlation-id-header.constant';
import {CORRELATION_ID} from './contexts/correlation-id.context';
import {correlationInterceptor} from './correlation.interceptor';

describe('correlationInterceptor', () => {
  let client: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([correlationInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('generates a UUID header and shares it through the request context', () => {
    let contextId = '';

    client.get('/api/accounts').subscribe();
    const request = httpTesting.expectOne((candidate) => {
      contextId = candidate.context.get(CORRELATION_ID);
      return candidate.url === '/api/accounts';
    });

    const header = request.request.headers.get(CORRELATION_ID_HEADER);
    expect(header).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(contextId).toBe(header);

    request.flush({});
  });

  it('propagates an existing correlation id', () => {
    client
      .get('/api/accounts', {context: new HttpContext().set(CORRELATION_ID, 'existing-id')})
      .subscribe();
    const request = httpTesting.expectOne('/api/accounts');
    expect(request.request.headers.get(CORRELATION_ID_HEADER)).toBe('existing-id');
    request.flush({});
  });
});
