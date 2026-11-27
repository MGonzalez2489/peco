import {HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ScheduledTransactionsApiService} from './scheduled-transactions-api.service';
import {provideApiTesting} from './api-testing.providers';

const BASE_URL = 'https://api.example.com/api';

describe('ScheduledTransactionsApiService', () => {
  let service: ScheduledTransactionsApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideApiTesting()],
    });
    service = TestBed.inject(ScheduledTransactionsApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('lists schedules with the default limit and optional filters', () => {
    service.list({period: '2026-11', active: true}).subscribe();
    const request = httpTesting.expectOne(
      (candidate) => candidate.url === `${BASE_URL}/scheduled-transactions`,
    );

    expect(request.request.params.get('limit')).toBe('20');
    expect(request.request.params.get('period')).toBe('2026-11');
    expect(request.request.params.get('active')).toBe('true');

    request.flush({data: [], meta: {correlationId: 'cid'}, error: null});
  });

  it('reads the due preview with its transport counters', () => {
    let pending: number | undefined;

    service.listDue({asOf: '2026-11-27'}).subscribe((result) => {
      pending = result.meta.pendingOccurrences;
    });
    const request = httpTesting.expectOne(
      (candidate) => candidate.url === `${BASE_URL}/scheduled-transactions/due`,
    );
    expect(request.request.params.get('asOf')).toBe('2026-11-27');
    request.flush({
      data: [],
      meta: {correlationId: 'cid', pendingOccurrences: 2, skippedWhileInactive: 1},
      error: null,
    });

    expect(pending).toBe(2);
  });

  it('applies due schedules with the as-of body', () => {
    service.applyDue({asOf: '2026-11-27'}).subscribe();
    const request = httpTesting.expectOne(`${BASE_URL}/scheduled-transactions/apply-due`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({asOf: '2026-11-27'});
    request.flush({data: {applied: 1, skipped: 0, failed: 0}, error: null});
  });

  it('executes one occurrence with an optional amount', () => {
    service.execute('abc', {actualAmount: 1000}).subscribe();
    const request = httpTesting.expectOne(`${BASE_URL}/scheduled-transactions/abc/execute`);
    expect(request.request.body).toEqual({actualAmount: 1000});
    request.flush({data: {}, error: null});
  });

  it('toggles active state and deletes with a 204 response', () => {
    service.toggle('abc', {active: false, version: 3}).subscribe();
    const toggle = httpTesting.expectOne(`${BASE_URL}/scheduled-transactions/abc/toggle`);
    expect(toggle.request.method).toBe('PATCH');
    expect(toggle.request.body).toEqual({active: false, version: 3});
    toggle.flush({data: {}, error: null});

    let completed = false;
    service.delete('abc').subscribe({complete: () => (completed = true)});
    const deletion = httpTesting.expectOne(`${BASE_URL}/scheduled-transactions/abc`);
    expect(deletion.request.method).toBe('DELETE');
    deletion.flush(null, {status: 204, statusText: 'No Content'});

    expect(completed).toBe(true);
  });
});
