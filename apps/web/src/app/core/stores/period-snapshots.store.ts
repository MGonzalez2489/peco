import {computed, inject} from '@angular/core';
import {withDevtools} from '@angular-architects/ngrx-toolkit';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {Account} from '../models/account.model';
import {Movement} from '../models/movement.model';
import {PeriodSnapshot} from '../models/period-snapshot.model';
import {PeriodSnapshotsStorageService} from '../services/period-snapshots-storage.service';
import {buildPeriodSnapshot} from '../utils/build-period-snapshot.util';
import {shiftPeriod} from '../utils/shift-period.util';
import {toPeriod} from '../utils/to-period.util';
import {AccountsStore} from './accounts.store';
import {MovementsStore} from './movements.store';

interface PeriodSnapshotsState {
  snapshots: PeriodSnapshot[];
  isLoading: boolean;
}

const INITIAL_STATE: PeriodSnapshotsState = {
  snapshots: [],
  isLoading: false,
};

/** Earliest month with activity across every account and settled movement. */
const resolveEarliestPeriod = (
  accounts: readonly Account[],
  movements: readonly Movement[],
): string => {
  const accountIds = new Set(accounts.map((account) => account.id));
  const accountPeriods = accounts.map((account) => toPeriod(account.createdAt));
  const movementPeriods = movements
    .filter((movement) => !movement.isCanceled)
    .filter(
      (movement) =>
        accountIds.has(movement.accountId) ||
        (movement.targetAccountId !== undefined && accountIds.has(movement.targetAccountId)),
    )
    .map((movement) => toPeriod(movement.date));
  const periods = [...accountPeriods, ...movementPeriods].filter((period) => period !== '');

  if (periods.length === 0) return '';

  return periods.reduce((earliest, period) => (period < earliest ? period : earliest));
};

export const PeriodSnapshotsStore = signalStore(
  {providedIn: 'root'},
  withState(INITIAL_STATE),
  withComputed(({snapshots}) => ({
    /** Monthly wrappers indexed directly by their `YYYY-MM` period. */
    snapshotMap: computed(() => {
      const map: Record<string, PeriodSnapshot> = {};

      for (const snapshot of snapshots()) {
        map[snapshot.period] = snapshot;
      }

      return map;
    }),
    /** Returns whether the period already has a closed snapshot wrapper. */
    hasSnapshotForPeriod: computed(() => {
      const periods = new Set(snapshots().map((snapshot) => snapshot.period));

      return (period: string): boolean => periods.has(period);
    }),
    /** Returns the wrapper of a period, when it exists. */
    snapshotFor: computed(() => {
      const indexed = new Map(snapshots().map((snapshot) => [snapshot.period, snapshot]));

      return (period: string): PeriodSnapshot | null => indexed.get(period) ?? null;
    }),
    /** Number of months that already have a closed wrapper. */
    closedPeriodCount: computed(() => new Set(snapshots().map((snapshot) => snapshot.period)).size),
  })),
  withMethods((store) => {
    const storage = inject(PeriodSnapshotsStorageService);
    const accountsStore = inject(AccountsStore);
    const movementsStore = inject(MovementsStore);

    const commit = (snapshots: PeriodSnapshot[]): void => {
      patchState(store, {snapshots});
      storage.saveAll(snapshots);
    };

    return {
      loadSnapshots(): void {
        patchState(store, {isLoading: true});

        try {
          patchState(store, {snapshots: storage.getAll(), isLoading: false});
        } catch {
          patchState(store, {snapshots: [], isLoading: false});
        }
      },
      /**
       * Closes every month between the earliest activity and the previous
       * month. Existing wrappers are never recomputed, so closed periods stay
       * immutable. Returns the number of generated wrappers.
       */
      verifyAndClosePreviousPeriods(now: Date = new Date()): number {
        const currentPeriod = toPeriod(now);
        if (!currentPeriod) return 0;

        const lastClosedPeriod = shiftPeriod(currentPeriod, -1);
        if (!lastClosedPeriod) return 0;

        const accounts = accountsStore.accounts();
        const movements = movementsStore.movements();
        const earliestPeriod = resolveEarliestPeriod(accounts, movements);
        if (!earliestPeriod || earliestPeriod > lastClosedPeriod) return 0;

        const closed = new Map(
          store.snapshots().map((snapshot) => [snapshot.period, snapshot] as const),
        );
        const created: PeriodSnapshot[] = [];

        for (
          let period = earliestPeriod;
          period !== '' && period <= lastClosedPeriod;
          period = shiftPeriod(period, 1)
        ) {
          if (closed.has(period)) continue;

          const snapshot = buildPeriodSnapshot({
            accounts,
            movements,
            period,
            previousSnapshot: closed.get(shiftPeriod(period, -1)) ?? null,
            now,
          });
          closed.set(period, snapshot);
          created.push(snapshot);
        }

        if (created.length === 0) return 0;

        commit([...store.snapshots(), ...created]);

        return created.length;
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.loadSnapshots();
      store.verifyAndClosePreviousPeriods();
    },
  }),
  withDevtools('PeriodSnapshotsStore'),
);
