import {Injectable, inject} from '@angular/core';
import type {
  CreateMovementRequest,
  CreateMovementResponse,
  DeleteMovementResult,
  ListMovementsQuery,
  MovementResponse,
  MovementListMeta,
  RevertMovementResponse,
  UpdateMovementRequest,
  UpdateMovementResponse,
} from '@peco/contracts';
import {Observable} from 'rxjs';
import {DEFAULT_API_LIST_LIMIT} from '../constants/default-api-list-limit.constant';
import {ApiListResult} from '../types/api-list-result.type';
import {ApiClientService} from './api-client.service';

@Injectable({providedIn: 'root'})
export class MovementsApiService {
  private readonly api = inject(ApiClientService);

  list(
    query: Omit<ListMovementsQuery, 'limit'> & {limit?: number} = {},
  ): Observable<ApiListResult<MovementResponse, MovementListMeta>> {
    return this.api.getList<MovementResponse, MovementListMeta>('movements', {
      limit: DEFAULT_API_LIST_LIMIT,
      ...query,
    });
  }

  getByPublicId(publicId: string): Observable<MovementResponse> {
    return this.api.get(`movements/${encodeURIComponent(publicId)}`);
  }

  create(body: CreateMovementRequest): Observable<CreateMovementResponse> {
    return this.api.post('movements', body);
  }

  update(publicId: string, body: UpdateMovementRequest): Observable<UpdateMovementResponse> {
    return this.api.patch(`movements/${encodeURIComponent(publicId)}`, body);
  }

  delete(publicId: string): Observable<DeleteMovementResult> {
    return this.api.delete(`movements/${encodeURIComponent(publicId)}`);
  }

  revert(publicId: string): Observable<RevertMovementResponse> {
    return this.api.post(`movements/${encodeURIComponent(publicId)}/revert`);
  }
}
