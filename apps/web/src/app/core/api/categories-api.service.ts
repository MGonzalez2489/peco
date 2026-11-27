import {Injectable, inject} from '@angular/core';
import type {CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest} from '@peco/contracts';
import {Observable} from 'rxjs';
import {ApiListResult} from '../types/api-list-result.type';
import {ApiClientService} from './api-client.service';

@Injectable({providedIn: 'root'})
export class CategoriesApiService {
  private readonly api = inject(ApiClientService);

  list(): Observable<ApiListResult<CategoryResponse>> {
    return this.api.getList<CategoryResponse>('categories');
  }

  create(body: CreateCategoryRequest): Observable<CategoryResponse> {
    return this.api.post('categories', body);
  }

  update(publicId: string, body: UpdateCategoryRequest): Observable<CategoryResponse> {
    return this.api.patch(`categories/${encodeURIComponent(publicId)}`, body);
  }
}
