import {HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {MovementTypeEnum} from '@peco/enums';
import {ReportsApiService} from './reports-api.service';
import {provideApiTesting} from './api-testing.providers';

const BASE_URL = 'https://api.example.com/api';

describe('ReportsApiService', () => {
  let service: ReportsApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideApiTesting()],
    });
    service = TestBed.inject(ReportsApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('sends the selected period to the dashboard', () => {
    service.dashboard({period: '2026-11'}).subscribe();
    const request = httpTesting.expectOne(
      (candidate) => candidate.url === `${BASE_URL}/reports/dashboard`,
    );
    expect(request.request.params.get('period')).toBe('2026-11');
    request.flush({data: {}, error: null});
  });

  it('sends a month range to account progression', () => {
    service.accountProgression('abc', {from: '2026-01', to: '2026-11'}).subscribe();
    const request = httpTesting.expectOne(
      (candidate) => candidate.url === `${BASE_URL}/reports/accounts/abc/progression`,
    );
    expect(request.request.params.get('from')).toBe('2026-01');
    expect(request.request.params.get('to')).toBe('2026-11');
    expect(request.request.params.has('period')).toBe(false);
    request.flush({data: {}, error: null});
  });

  it('requires the movement type on category distribution', () => {
    service
      .categoryDistribution({period: '2026-11', type: MovementTypeEnum.EXPENSE.toString()})
      .subscribe();
    const request = httpTesting.expectOne(
      (candidate) => candidate.url === `${BASE_URL}/reports/categories/distribution`,
    );
    expect(request.request.params.get('type')).toBe('EXPENSE');
    request.flush({data: [], error: null});
  });
});
