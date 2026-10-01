import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable} from 'rxjs';
import {ChangelogRelease} from '../models/changelog.model';

const CHANGELOG_URL = 'assets/changelog.json';

@Injectable({providedIn: 'root'})
export class ChangelogApiService {
  private readonly http = inject(HttpClient);

  getReleases(): Observable<ChangelogRelease[]> {
    return this.http.get<ChangelogRelease[]>(CHANGELOG_URL);
  }
}
