import {Injectable, inject} from '@angular/core';
import type {
  ApplyDueRequest,
  ApplyDueResponse,
  CancelScheduledOccurrenceRequest,
  CancelScheduledOccurrenceResponse,
  CreateScheduledTransactionRequest,
  ExecuteScheduledTransactionRequest,
  ExecuteScheduledTransactionResponse,
  ListDueSchedulesQuery,
  ListScheduledTransactionsQuery,
  ScheduledTransactionListMeta,
  ScheduledTransactionResponse,
  ToggleScheduledTransactionRequest,
  UpdateScheduledTransactionRequest,
} from '@peco/contracts';
import {Observable} from 'rxjs';
import {DEFAULT_API_LIST_LIMIT} from '../constants/default-api-list-limit.constant';
import {ApiListResult} from '../types/api-list-result.type';
import {ApiClientService} from './api-client.service';

interface DueListMeta {
  pendingOccurrences: number;
  skippedWhileInactive: number;
}

@Injectable({providedIn: 'root'})
export class ScheduledTransactionsApiService {
  private readonly api = inject(ApiClientService);

  list(
    query: Omit<ListScheduledTransactionsQuery, 'limit'> & {limit?: number} = {},
  ): Observable<ApiListResult<ScheduledTransactionResponse, ScheduledTransactionListMeta>> {
    return this.api.getList<ScheduledTransactionResponse, ScheduledTransactionListMeta>(
      'scheduled-transactions',
      {limit: DEFAULT_API_LIST_LIMIT, ...query},
    );
  }

  listDue(
    query: ListDueSchedulesQuery = {},
  ): Observable<ApiListResult<ScheduledTransactionResponse, DueListMeta>> {
    return this.api.getList<ScheduledTransactionResponse, DueListMeta>(
      'scheduled-transactions/due',
      query,
    );
  }

  applyDue(body: ApplyDueRequest = {}): Observable<ApplyDueResponse> {
    return this.api.post('scheduled-transactions/apply-due', body);
  }

  getByPublicId(publicId: string): Observable<ScheduledTransactionResponse> {
    return this.api.get(`scheduled-transactions/${encodeURIComponent(publicId)}`);
  }

  create(body: CreateScheduledTransactionRequest): Observable<ScheduledTransactionResponse> {
    return this.api.post('scheduled-transactions', body);
  }

  update(
    publicId: string,
    body: UpdateScheduledTransactionRequest,
  ): Observable<ScheduledTransactionResponse> {
    return this.api.patch(`scheduled-transactions/${encodeURIComponent(publicId)}`, body);
  }

  toggle(
    publicId: string,
    body: ToggleScheduledTransactionRequest,
  ): Observable<ScheduledTransactionResponse> {
    return this.api.patch(`scheduled-transactions/${encodeURIComponent(publicId)}/toggle`, body);
  }

  execute(
    publicId: string,
    body: ExecuteScheduledTransactionRequest = {},
  ): Observable<ExecuteScheduledTransactionResponse> {
    return this.api.post(`scheduled-transactions/${encodeURIComponent(publicId)}/execute`, body);
  }

  cancelOccurrence(
    publicId: string,
    body: CancelScheduledOccurrenceRequest = {},
  ): Observable<CancelScheduledOccurrenceResponse> {
    return this.api.post(
      `scheduled-transactions/${encodeURIComponent(publicId)}/cancel-occurrence`,
      body,
    );
  }

  delete(publicId: string): Observable<void> {
    return this.api.deleteVoid(`scheduled-transactions/${encodeURIComponent(publicId)}`);
  }
}
