import type {RecurrenceFrequency} from '@peco/contracts';
import {RecurrenceFrequencyEnum} from '@peco/enums';
import {addClampedMonthsToDate} from './add-clamped-months-to-date.util';
import {addDaysToDate} from './add-days-to-date.util';
import {resolveExecutionDate} from './resolve-execution-date.util';

/** Contemplated/applied pair for one zero-based grid step from the anchor (10.2/D51/D56). */
export const recurrenceDatesAt = (
  anchorDate: string,
  frequency: RecurrenceFrequency,
  interval: number,
  step: number,
): {contemplatedDate: string; executionDate: string} => {
  if (!Number.isInteger(step) || step < 0) {
    throw new RangeError('The recurrence step must be a non-negative integer');
  }

  let contemplatedDate: string;
  switch (frequency) {
    case RecurrenceFrequencyEnum.DAILY.toString():
      contemplatedDate = addDaysToDate(anchorDate, step * interval);
      break;
    case RecurrenceFrequencyEnum.WEEKLY.toString():
      contemplatedDate = addDaysToDate(anchorDate, step * interval * 7);
      break;
    case RecurrenceFrequencyEnum.FORTNIGHTLY.toString():
      contemplatedDate = addDaysToDate(anchorDate, step * interval * 14);
      break;
    case RecurrenceFrequencyEnum.MONTHLY.toString():
      contemplatedDate = addClampedMonthsToDate(anchorDate, step * interval);
      break;
    case RecurrenceFrequencyEnum.YEARLY.toString():
      contemplatedDate = addClampedMonthsToDate(anchorDate, step * interval * 12);
      break;
    default:
      throw new RangeError(`Unsupported recurrence frequency: ${frequency}`);
  }

  return {
    contemplatedDate,
    executionDate: resolveExecutionDate(contemplatedDate, anchorDate, frequency),
  };
};
