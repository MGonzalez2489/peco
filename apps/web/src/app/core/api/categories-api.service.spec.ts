import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {CategoryApplyTypeEnum} from '@peco/enums';
import {API_BASE_URL} from '../tokens/api-base-url.token';
import {CategoriesApiService} from './categories-api.service';

const BASE_URL = 'https://api.example.com/api';

describe('CategoriesApiService', () => {
  let service: CategoriesApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {provide: API_BASE_URL, useValue: BASE_URL},
      ],
    });
    service = TestBed.inject(CategoriesApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('lists categories from the list envelope', () => {
    let names: string[] | undefined;

    service.list().subscribe((result) => (names = result.data.map((category) => category.name)));
    httpTesting.expectOne(`${BASE_URL}/categories`).flush({
      data: [{name: 'Comida'}],
      meta: {correlationId: 'cid', count: 1},
      error: null,
    });

    expect(names).toEqual(['Comida']);
  });

  it('creates a category and unwraps the returned entity', () => {
    const body = {
      displayName: 'Comida',
      icon: 'utensils',
      color: '#000000',
      applyType: CategoryApplyTypeEnum.EXPENSE.toString(),
    };

    service.create(body).subscribe();
    const request = httpTesting.expectOne(`${BASE_URL}/categories`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({data: {}, error: null});
  });

  it('updates a category without exposing internal ids', () => {
    service.update('abc', {displayName: 'Food'}).subscribe();
    const request = httpTesting.expectOne(`${BASE_URL}/categories/abc`);
    expect(request.request.method).toBe('PATCH');
    request.flush({data: {}, error: null});
  });
});
