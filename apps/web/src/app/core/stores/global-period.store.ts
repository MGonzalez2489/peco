import {computed} from '@angular/core';
import {withDevtools} from '@angular-architects/ngrx-toolkit';
import {patchState, signalStore, withComputed, withMethods, withState} from '@ngrx/signals';
import {GlobalPeriodState} from '../models/global-period-state.model';
import {formatPeriodLabel} from '../utils/format-period-label.util';
import {shiftPeriod} from '../utils/shift-period.util';
import {toPeriod} from '../utils/to-period.util';

const currentPeriodState = (): GlobalPeriodState => {
  const now = new Date();

  return {selectedYear: now.getFullYear(), selectedMonth: now.getMonth() + 1};
};

const periodKeyOf = ({selectedYear, selectedMonth}: GlobalPeriodState): string =>
  `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

/**
 * App-wide master context for every financial view. Feature components read
 * `selectedPeriodKey` and decide whether to use frozen snapshots (past) or live
 * data (current and future).
 */
export const GlobalPeriodStore = signalStore(
  {providedIn: 'root'},
  withState(currentPeriodState),
  withComputed(({selectedYear, selectedMonth}) => {
    const selectedPeriodKey = computed(() =>
      periodKeyOf({selectedYear: selectedYear(), selectedMonth: selectedMonth()}),
    );
    const currentSystemPeriodKey = computed(() => toPeriod(new Date()));

    return {
      selectedPeriodKey,
      currentSystemPeriodKey,
      isCurrentPeriod: computed(() => selectedPeriodKey() === currentSystemPeriodKey()),
      isPastPeriod: computed(() => selectedPeriodKey() < currentSystemPeriodKey()),
      isFuturePeriod: computed(() => selectedPeriodKey() > currentSystemPeriodKey()),
      formattedPeriodLabel: computed(() => formatPeriodLabel(selectedPeriodKey(), 'long')),
      formattedPeriodLabelCompact: computed(() =>
        formatPeriodLabel(selectedPeriodKey(), 'compact'),
      ),
    };
  }),
  withMethods((store) => {
    const applyPeriodKey = (period: string): void => {
      const match = /^(\d{4})-(\d{2})$/.exec(period);
      if (!match) return;

      patchState(store, {
        selectedYear: Number(match[1]),
        selectedMonth: Number(match[2]),
      });
    };

    return {
      setPeriod(year: number, month: number): void {
        if (!Number.isInteger(year) || month < 1 || month > 12) return;

        patchState(store, {selectedYear: year, selectedMonth: Math.trunc(month)});
      },
      resetToCurrentPeriod(): void {
        patchState(store, currentPeriodState());
      },
      nextPeriod(): void {
        applyPeriodKey(shiftPeriod(store.selectedPeriodKey(), 1));
      },
      previousPeriod(): void {
        applyPeriodKey(shiftPeriod(store.selectedPeriodKey(), -1));
      },
    };
  }),
  withDevtools('GlobalPeriodStore'),
);
