import {HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {MovementsApiService} from './movements-api.service';
import {provideApiTesting} from './api-testing.providers';

const BASE_URL = 'https://api.example.com/api';

describe('MovementsApiService', () => {
  let service: MovementsApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideApiTesting()],
    });
    service = TestBed.inject(MovementsApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('sends the default limit and echoes optional filters', () => {
    service
      .list({
        period: '2026-11',
        note: 'cafe',
        excludeReversals: true,
        cursor: 'next-cursor',
      })
      .subscribe();
    const request = httpTesting.expectOne((candidate) => candidate.url === `${BASE_URL}/movements`);

    expect(request.request.params.get('limit')).toBe('20');
    expect(request.request.params.get('period')).toBe('2026-11');
    expect(request.request.params.get('note')).toBe('cafe');
    expect(request.request.params.get('excludeReversals')).toBe('true');
    expect(request.request.params.get('cursor')).toBe('next-cursor');

    request.flush({data: [], meta: {correlationId: 'cid'}, error: null});
  });

  it('does not clamp an explicitly requested limit', () => {
    service.list({limit: 500}).subscribe();
    const request = httpTesting.expectOne((candidate) => candidate.url === `${BASE_URL}/movements`);
    expect(request.request.params.get('limit')).toBe('500');
    request.flush({data: [], meta: {correlationId: 'cid'}, error: null});
  });

  it('reverts a movement with POST and unwraps the response', () => {
    let reversalId: string | undefined;

    service.revert('abc').subscribe((result) => (reversalId = result.reversal.publicId));
    const request = httpTesting.expectOne(`${BASE_URL}/movements/abc/revert`);
    expect(request.request.method).toBe('POST');
    request.flush({data: {reversal: {publicId: 'rev'}}, error: null});

    expect(reversalId).toBe('rev');
  });

  it('deletes a movement from a 200 envelope', () => {
    service.delete('abc').subscribe();
    const request = httpTesting.expectOne(`${BASE_URL}/movements/abc`);
    expect(request.request.method).toBe('DELETE');
    request.flush({data: {deletedPublicId: 'abc'}, error: null});
  });
});
