import {DestroyRef, computed, inject} from '@angular/core';
import {
  setError,
  setLoaded,
  setLoading,
  withCallState,
  withDevtools,
} from '@angular-architects/ngrx-toolkit';
import {patchState, signalStore, withComputed, withMethods, withState} from '@ngrx/signals';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {IS_PRODUCTION} from '../constants/is-production.constant';
import {MAX_VISIBLE_RELEASES} from '../constants/max-visible-releases.constant';
import {ChangelogRelease} from '../models/changelog.model';
import {ChangelogApiService} from '../services/changelog-api.service';

interface ChangelogState {
  releases: ChangelogRelease[];
}

const INITIAL_STATE: ChangelogState = {
  releases: [],
};

export const ChangelogStore = signalStore(
  {providedIn: 'root'},
  withState(INITIAL_STATE),
  withCallState(),
  withComputed(({releases}) => {
    const isProduction = inject(IS_PRODUCTION);

    return {
      lastChanges: computed(() =>
        releases()
          // Drafts stay visible outside production so they can be reviewed
          // locally or in a non-production environment.
          .filter((release) => release._draft !== true || !isProduction)
          .slice(0, MAX_VISIBLE_RELEASES),
      ),
    };
  }),
  withMethods((store) => {
    const api = inject(ChangelogApiService);
    const destroyRef = inject(DestroyRef);

    return {
      load(): void {
        if (store.loading()) return;

        patchState(store, setLoading());

        api
          .getReleases()
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (releases) =>
              patchState(store, {releases: Array.isArray(releases) ? releases : []}),
            error: (error: unknown) => {
              patchState(store, {releases: []});
              patchState(store, setError(error));
            },
            complete: () => patchState(store, setLoaded()),
          });
      },
      resetError(): void {
        patchState(store, setLoaded());
      },
    };
  }),
  withDevtools('ChangelogStore'),
);
