import {HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {PreferencesApiService} from './preferences-api.service';
import {provideApiTesting} from './api-testing.providers';

const BASE_URL = 'https://api.example.com/api';

describe('PreferencesApiService', () => {
  let service: PreferencesApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideApiTesting()],
    });
    service = TestBed.inject(PreferencesApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('reads nested preferences from the single envelope', () => {
    let hideBalance: boolean | undefined;

    service.get().subscribe((preferences) => {
      hideBalance = preferences.accounts.hideBalance;
    });
    httpTesting.expectOne(`${BASE_URL}/preferences`).flush({
      data: {theme: 'light', accounts: {hideBalance: true}, movements: {hideReversal: false}},
      error: null,
    });

    expect(hideBalance).toBe(true);
  });

  it('patches only the submitted preference fields', () => {
    service.update({accounts: {hideBalance: false}}).subscribe();
    const request = httpTesting.expectOne(`${BASE_URL}/preferences`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({accounts: {hideBalance: false}});
    request.flush({data: {}, error: null});
  });
});
