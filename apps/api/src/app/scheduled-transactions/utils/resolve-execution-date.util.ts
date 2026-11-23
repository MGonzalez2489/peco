import type {RecurrenceFrequency} from '@peco/contracts';
import {RecurrenceFrequencyEnum} from '@peco/enums';
import {isLastDayOfMonth} from './is-last-day-of-month.util';
import {parseDateOnly} from './parse-date-only.util';
import {previousBusinessDay} from './previous-business-day.util';

/**
 * Month-end recurrences anchored on the last day of their month move weekend
 * contemplated dates back to Friday (D56); every other recurrence keeps its
 * exact date. The applied date is never later than the contemplated one.
 */
export const resolveExecutionDate = (
  contemplatedDate: string,
  anchorDate: string,
  frequency: RecurrenceFrequency,
): string => {
  if (
    frequency !== RecurrenceFrequencyEnum.MONTHLY.toString() &&
    frequency !== RecurrenceFrequencyEnum.YEARLY.toString()
  ) {
    return contemplatedDate;
  }
  if (!isLastDayOfMonth(anchorDate)) {
    return contemplatedDate;
  }

  const {year, month, day} = parseDateOnly(contemplatedDate);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return weekday === 0 || weekday === 6
    ? previousBusinessDay(contemplatedDate)
    : contemplatedDate;
};
