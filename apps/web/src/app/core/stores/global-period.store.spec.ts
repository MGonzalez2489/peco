import {TestBed} from '@angular/core/testing';
import {formatPeriodLabel} from '../utils/format-period-label.util';
import {shiftPeriod} from '../utils/shift-period.util';
import {toPeriod} from '../utils/to-period.util';
import {GlobalPeriodStore} from './global-period.store';

describe('GlobalPeriodStore', () => {
  let store: InstanceType<typeof GlobalPeriodStore>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({providers: [GlobalPeriodStore]});
    store = TestBed.inject(GlobalPeriodStore);
  });

  const currentKey = (): string => toPeriod(new Date());

  it('starts on the current system period', () => {
    const now = new Date();

    expect(store.selectedYear()).toBe(now.getFullYear());
    expect(store.selectedMonth()).toBe(now.getMonth() + 1);
    expect(store.selectedPeriodKey()).toBe(currentKey());
    expect(store.isCurrentPeriod()).toBe(true);
    expect(store.isPastPeriod()).toBe(false);
    expect(store.isFuturePeriod()).toBe(false);
  });

  it('formats the selected period for desktop and mobile', () => {
    store.setPeriod(2026, 11);

    expect(store.formattedPeriodLabel()).toBe('Noviembre 2026');
    expect(store.formattedPeriodLabelCompact()).toBe('11 / 2026');
  });

  it('marks a previous month as past and a next month as future', () => {
    const previous = shiftPeriod(currentKey(), -1);
    const next = shiftPeriod(currentKey(), 1);

    const [previousYear, previousMonth] = previous.split('-').map(Number);
    store.setPeriod(previousYear, previousMonth);
    expect(store.isPastPeriod()).toBe(true);
    expect(store.isCurrentPeriod()).toBe(false);
    expect(store.isFuturePeriod()).toBe(false);

    const [nextYear, nextMonth] = next.split('-').map(Number);
    store.setPeriod(nextYear, nextMonth);
    expect(store.isFuturePeriod()).toBe(true);
    expect(store.isCurrentPeriod()).toBe(false);
    expect(store.isPastPeriod()).toBe(false);
  });

  it('ignores invalid months', () => {
    const year = store.selectedYear();
    const month = store.selectedMonth();

    store.setPeriod(year, 0);
    store.setPeriod(year, 13);

    expect(store.selectedYear()).toBe(year);
    expect(store.selectedMonth()).toBe(month);
  });

  it('wraps the year when moving to the next and previous periods', () => {
    store.setPeriod(2026, 12);
    store.nextPeriod();
    expect(store.selectedPeriodKey()).toBe('2027-01');

    store.setPeriod(2026, 1);
    store.previousPeriod();
    expect(store.selectedPeriodKey()).toBe('2025-12');
  });

  it('returns to the current period with the reset method', () => {
    store.setPeriod(2020, 5);

    store.resetToCurrentPeriod();

    expect(store.selectedPeriodKey()).toBe(currentKey());
    expect(store.isCurrentPeriod()).toBe(true);
  });

  it('formats a long Spanish label from the period helper', () => {
    expect(formatPeriodLabel('2026-01', 'long')).toBe('Enero 2026');
    expect(formatPeriodLabel('2026-12', 'compact')).toBe('12 / 2026');
    expect(formatPeriodLabel('invalid', 'long')).toBe('');
  });
});
