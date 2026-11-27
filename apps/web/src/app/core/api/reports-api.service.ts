import {Injectable, inject} from '@angular/core';
import type {
  AccountProgressionResponse,
  CategoryDistributionResponse,
  DashboardReportResponse,
  MovementProgressionResponse,
  MovementType,
  ReportPeriodQuery,
  ScheduledCommitmentsResponse,
} from '@peco/contracts';
import {Observable} from 'rxjs';
import {ApiClientService} from './api-client.service';

@Injectable({providedIn: 'root'})
export class ReportsApiService {
  private readonly api = inject(ApiClientService);

  dashboard(query: ReportPeriodQuery = {}): Observable<DashboardReportResponse> {
    return this.api.get('reports/dashboard', query);
  }

  accountProgression(
    publicId: string,
    query: ReportPeriodQuery = {},
  ): Observable<AccountProgressionResponse> {
    return this.api.get(
      `reports/accounts/${encodeURIComponent(publicId)}/progression`,
      query,
    );
  }

  movementsProgression(
    query: ReportPeriodQuery & {excludeReversals?: boolean} = {},
  ): Observable<MovementProgressionResponse> {
    return this.api.get('reports/movements/progression', query);
  }

  categoryDistribution(
    query: ReportPeriodQuery & {type: MovementType},
  ): Observable<CategoryDistributionResponse> {
    return this.api.get('reports/categories/distribution', query);
  }

  scheduledCommitments(query: ReportPeriodQuery = {}): Observable<ScheduledCommitmentsResponse> {
    return this.api.get('reports/scheduled/commitments', query);
  }
}
