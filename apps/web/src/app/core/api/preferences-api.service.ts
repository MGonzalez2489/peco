import {Injectable, inject} from '@angular/core';
import type {PreferencesResponse, UpdatePreferencesRequest} from '@peco/contracts';
import {Observable} from 'rxjs';
import {ApiClientService} from './api-client.service';

@Injectable({providedIn: 'root'})
export class PreferencesApiService {
  private readonly api = inject(ApiClientService);

  get(): Observable<PreferencesResponse> {
    return this.api.get('preferences');
  }

  update(body: UpdatePreferencesRequest): Observable<PreferencesResponse> {
    return this.api.patch('preferences', body);
  }
}
