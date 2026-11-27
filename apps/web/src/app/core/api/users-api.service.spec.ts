import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {API_BASE_URL} from '../tokens/api-base-url.token';
import {UsersApiService} from './users-api.service';

const BASE_URL = 'https://api.example.com/api';

describe('UsersApiService', () => {
  let service: UsersApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {provide: API_BASE_URL, useValue: BASE_URL},
      ],
    });
    service = TestBed.inject(UsersApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('exports the user data from the single envelope', () => {
    let exported: object | undefined;

    service.exportData().subscribe((data) => (exported = data));
    httpTesting.expectOne(`${BASE_URL}/users/me/export`).flush({
      data: {user: {}},
      error: null,
    });

    expect(exported).toEqual({user: {}});
  });

  it('patches the profile and unwraps the response', () => {
    service.updateProfile({name: 'New Name'}).subscribe();
    const request = httpTesting.expectOne(`${BASE_URL}/users/me`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({name: 'New Name'});
    request.flush({data: {}, error: null});
  });

  it('deletes the account with the password in the DELETE body', () => {
    service.deleteUser({password: 'secret'}).subscribe();
    const request = httpTesting.expectOne(`${BASE_URL}/users/me`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({password: 'secret'});
    request.flush(null, {status: 204, statusText: 'No Content'});
  });
});
