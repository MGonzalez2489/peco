import {HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {PeriodsApiService} from './periods-api.service';
import {provideApiTesting} from './api-testing.providers';

const BASE_URL = 'https://api.example.com/api';

describe('PeriodsApiService', () => {
  let service: PeriodsApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideApiTesting()],
    });
    service = TestBed.inject(PeriodsApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('returns the period array from the single envelope without list meta', () => {
    let periods: string[] | undefined;

    service.list({from: '2026-01', to: '2026-11'}).subscribe((result) => {
      periods = result.map((period) => period.period);
    });
    const request = httpTesting.expectOne((candidate) => candidate.url === `${BASE_URL}/periods`);
    expect(request.request.params.get('from')).toBe('2026-01');
    expect(request.request.params.get('to')).toBe('2026-11');
    request.flush({data: [{period: '2026-11'}], error: null});

    expect(periods).toEqual(['2026-11']);
  });

  it('closes a period with POST and unwraps the snapshot', () => {
    let closedPeriod: string | undefined;

    service.close('2026-11').subscribe((snapshot) => (closedPeriod = snapshot.period));
    const request = httpTesting.expectOne(`${BASE_URL}/periods/2026-11/close`);
    expect(request.request.method).toBe('POST');
    request.flush({data: {period: '2026-11'}, error: null});

    expect(closedPeriod).toBe('2026-11');
  });
});
