import {HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {HealthApiService} from './health-api.service';
import {provideApiTesting} from './api-testing.providers';

const BASE_URL = 'https://api.example.com/api';

describe('HealthApiService', () => {
  let service: HealthApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideApiTesting()],
    });
    service = TestBed.inject(HealthApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('requests the flat health probe outside the api prefix', () => {
    let status: string | undefined;

    service.get().subscribe((health) => (status = health.status));
    const request = httpTesting.expectOne('https://api.example.com/health');
    expect(request.request.method).toBe('GET');
    request.flush({status: 'ok', uptime: 12, db: 'up'});

    expect(status).toBe('ok');
  });
});
