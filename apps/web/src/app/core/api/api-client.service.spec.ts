import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {API_BASE_URL} from '../tokens/api-base-url.token';
import {ApiClientService} from './api-client.service';

const BASE_URL = 'https://api.example.com/api';

describe('ApiClientService', () => {
  let client: ApiClientService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {provide: API_BASE_URL, useValue: BASE_URL},
      ],
    });
    client = TestBed.inject(ApiClientService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('unwraps a single-resource envelope exactly once', () => {
    let result: {publicId: string} | undefined;

    client.get<{publicId: string}>('accounts/one').subscribe((value) => (result = value));
    httpTesting.expectOne(`${BASE_URL}/accounts/one`).flush({
      data: {publicId: 'one'},
      error: null,
    });

    expect(result).toEqual({publicId: 'one'});
  });

  it('keeps list meta and drops the error field', () => {
    let result: {data: string[]; meta: {correlationId: string; count: number}} | undefined;

    client
      .getList<string, {count: number}>('categories')
      .subscribe((value) => (result = value));
    httpTesting.expectOne(`${BASE_URL}/categories`).flush({
      data: ['a'],
      meta: {correlationId: 'cid', count: 1},
      error: null,
    });

    expect(result).toEqual({data: ['a'], meta: {correlationId: 'cid', count: 1}});
  });

  it('serializes primitive query values and skips nullish ones', () => {
    client
      .getList('movements', {
        period: '2026-11',
        excludeReversals: false,
        limit: 20,
        cursor: undefined,
        note: null,
      })
      .subscribe();
    const request = httpTesting.expectOne(
      (candidate) => candidate.url === `${BASE_URL}/movements`,
    );

    expect(request.request.params.get('period')).toBe('2026-11');
    expect(request.request.params.get('excludeReversals')).toBe('false');
    expect(request.request.params.get('limit')).toBe('20');
    expect(request.request.params.has('cursor')).toBe(false);
    expect(request.request.params.has('note')).toBe(false);

    request.flush({data: [], meta: {correlationId: 'cid'}, error: null});
  });

  it('maps 204 responses to void for writes and deletes', () => {
    let completed = false;

    client.postVoid('auth/logout', {refreshToken: 'token'}).subscribe({
      complete: () => (completed = true),
    });
    httpTesting
      .expectOne(`${BASE_URL}/auth/logout`)
      .flush(null, {status: 204, statusText: 'No Content'});

    client.deleteVoid('users/me', {body: {password: 'secret'}}).subscribe();
    const deletion = httpTesting.expectOne(`${BASE_URL}/users/me`);
    expect(deletion.request.method).toBe('DELETE');
    expect(deletion.request.body).toEqual({password: 'secret'});
    deletion.flush(null, {status: 204, statusText: 'No Content'});

    expect(completed).toBe(true);
  });

  it('does not prefix absolute urls such as the health probe', () => {
    const healthUrl = 'https://api.example.com/health';
    let result: {status: string} | undefined;

    client.getRaw<{status: string}>(healthUrl).subscribe((value) => (result = value));
    httpTesting.expectOne(healthUrl).flush({status: 'ok', uptime: 1, db: 'up'});

    expect(result).toEqual({status: 'ok', uptime: 1, db: 'up'});
  });
});
