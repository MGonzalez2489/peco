import {Injectable, inject} from '@angular/core';
import type {
  ListPeriodsQuery,
  PeriodSnapshotResponse,
  PeriodSummaryResponse,
} from '@peco/contracts';
import {Observable} from 'rxjs';
import {ApiClientService} from './api-client.service';

@Injectable({providedIn: 'root'})
export class PeriodsApiService {
  private readonly api = inject(ApiClientService);

  /** `GET /periods` uses a single envelope whose `data` is an array, not a list envelope. */
  list(query: ListPeriodsQuery = {}): Observable<PeriodSummaryResponse[]> {
    return this.api.get('periods', query);
  }

  getByPeriod(period: string): Observable<PeriodSnapshotResponse> {
    return this.api.get(`periods/${encodeURIComponent(period)}`);
  }

  close(period: string): Observable<PeriodSnapshotResponse> {
    return this.api.post(`periods/${encodeURIComponent(period)}/close`);
  }
}
