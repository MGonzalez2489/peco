import {Injectable, inject} from '@angular/core';
import {Observable} from 'rxjs';
import {HealthStatus} from '../types/health-status.type';
import {ApiClientService} from './api-client.service';

@Injectable({providedIn: 'root'})
export class HealthApiService {
  private readonly api = inject(ApiClientService);

  get(): Observable<HealthStatus> {
    return this.api.getRaw<HealthStatus>(this.api.healthUrl);
  }
}
