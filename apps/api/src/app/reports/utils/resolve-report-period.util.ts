import type {ReportPeriodQuery} from '@peco/contracts';
import {MAX_PERIOD_RANGE_MONTHS} from '../../periods/constants/max-period-range-months.constant';
import {periodRangeMonthCount} from '../../periods/utils/period-range-month-count.util';
import {previousPeriod} from '../../periods/utils/previous-period.util';
import {reportPeriodRangeException} from './report-period-range.exception';

const DEFAULT_LOOKBACK_MONTHS = 12;

/** The default window ends at `to` and includes the previous twelve months (Q8). */
const defaultWindowFrom = (to: string): string => {
  let from = to;
  for (let month = 0; month < DEFAULT_LOOKBACK_MONTHS; month += 1) {
    from = previousPeriod(from);
  }
  return from;
};

/**
 * Resolves the effective report month from the optional period/range query.
 * Explicit ranges are validated, never truncated; the caller's owner-scoped
 * reads remain in each report service (8.4/Q8/US-806).
 */
export const resolveReportPeriod = (
  query: ReportPeriodQuery,
  currentPeriod: string,
): string => {
  if (query.period) {
    return query.period;
  }

  const to = query.to ?? currentPeriod;
  const from = query.from ?? defaultWindowFrom(to);
  const months = periodRangeMonthCount(from, to);
  if (months === 0 || months > MAX_PERIOD_RANGE_MONTHS) {
    throw reportPeriodRangeException();
  }

  return to;
};
