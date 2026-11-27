import {Injectable, inject} from '@angular/core';
import type {
  AccountResponse,
  AccountSummary,
  CreateAccountRequest,
  DeleteAccountResult,
  UpdateAccountPinRequest,
  UpdateAccountRequest,
} from '@peco/contracts';
import {Observable} from 'rxjs';
import {ApiListResult} from '../types/api-list-result.type';
import {ApiClientService} from './api-client.service';

@Injectable({providedIn: 'root'})
export class AccountsApiService {
  private readonly api = inject(ApiClientService);

  list(): Observable<ApiListResult<AccountResponse, {summary: AccountSummary}>> {
    return this.api.getList<AccountResponse, {summary: AccountSummary}>('accounts');
  }

  getByPublicId(publicId: string): Observable<AccountResponse> {
    return this.api.get(`accounts/${encodeURIComponent(publicId)}`);
  }

  create(body: CreateAccountRequest): Observable<AccountResponse> {
    return this.api.post('accounts', body);
  }

  update(publicId: string, body: UpdateAccountRequest): Observable<AccountResponse> {
    return this.api.patch(`accounts/${encodeURIComponent(publicId)}`, body);
  }

  setPin(publicId: string, body: UpdateAccountPinRequest): Observable<AccountResponse> {
    return this.api.patch(`accounts/${encodeURIComponent(publicId)}/pin`, body);
  }

  delete(publicId: string, transferToPublicId?: string): Observable<DeleteAccountResult> {
    return this.api.delete(`accounts/${encodeURIComponent(publicId)}`, {
      query: transferToPublicId ? {transferToPublicId} : undefined,
    });
  }
}
