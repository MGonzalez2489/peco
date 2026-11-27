import {HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {AccountsApiService} from './accounts-api.service';
import {provideApiTesting} from './api-testing.providers';

const BASE_URL = 'https://api.example.com/api';

describe('AccountsApiService', () => {
  let service: AccountsApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideApiTesting()],
    });
    service = TestBed.inject(AccountsApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('lists accounts and keeps the summary in meta', () => {
    let result: {data: object[]; meta: {summary: object}} | undefined;

    service.list().subscribe((value) => (result = value));
    httpTesting.expectOne(`${BASE_URL}/accounts`).flush({
      data: [],
      meta: {correlationId: 'cid', summary: {accountCount: 0}},
      error: null,
    });

    expect(result?.meta.summary).toEqual({accountCount: 0});
  });

  it('sends the transfer target as a query parameter when deleting', () => {
    let deletedAccount: string | undefined;

    service
      .delete('one', 'two')
      .subscribe((result) => (deletedAccount = result.deletedAccountPublicId));
    const request = httpTesting.expectOne(
      (candidate) => candidate.url === `${BASE_URL}/accounts/one`,
    );
    expect(request.request.method).toBe('DELETE');
    expect(request.request.params.get('transferToPublicId')).toBe('two');
    request.flush({
      data: {deletedAccountPublicId: 'one', transferMovement: null, balances: []},
      error: null,
    });

    expect(deletedAccount).toBe('one');
  });

  it('patches pin state with an encoded public id', () => {
    service.setPin('a/b', {pinToHome: true}).subscribe();
    const request = httpTesting.expectOne(`${BASE_URL}/accounts/a%2Fb/pin`);
    expect(request.request.method).toBe('PATCH');
    request.flush({data: {}, error: null});
  });
});
