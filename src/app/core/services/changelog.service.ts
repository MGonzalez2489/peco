import {computed, inject, Injectable, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ChangelogRelease} from '../models/changelog.model';

export const MAX_VISIBLE_RELEASES = 5;

const CHANGELOG_URL = 'assets/changelog.json';

@Injectable({providedIn: 'root'})
export class ChangelogService {
  private readonly http = inject(HttpClient);

  readonly releases = signal<ChangelogRelease[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal(false);

  readonly ultimosCambios = computed(() => this.releases().slice(0, MAX_VISIBLE_RELEASES));

  load(): void {
    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(false);

    this.http.get<ChangelogRelease[]>(CHANGELOG_URL).subscribe({
      next: (releases) => {
        this.releases.set(Array.isArray(releases) ? releases : []);
      },
      error: () => {
        this.error.set(true);
        this.releases.set([]);
        this.isLoading.set(false);
      },
      complete: () => this.isLoading.set(false),
    });
  }
}
