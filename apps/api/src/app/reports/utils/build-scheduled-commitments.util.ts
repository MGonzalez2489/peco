import {MAX_RECURRENCE_STEPS} from '../../scheduled-transactions/constants/max-recurrence-steps.constant';
import {recurrenceDatesAt} from '../../scheduled-transactions/utils/recurrence-dates-at.util';
import type {ScheduledCommitmentAllocation} from '../types/scheduled-commitment-allocation.type';
import type {ScheduledCommitmentSchedule} from '../types/scheduled-commitment-schedule.type';

/**
 * Combines applied executions with the unprocessed grid points of active
 * schedules. A past month only has applied amounts; the current and future
 * months also project pending amounts (8.11/8.13, US-805). The `endDate` and
 * `totalOccurrences` stop conditions are checked against the contemplated date,
 * matching 10.4.
 */
export const buildScheduledCommitments = (
  periodFrom: string,
  periodTo: string,
  includePending: boolean,
  executions: readonly ScheduledCommitmentAllocation[],
  schedules: readonly ScheduledCommitmentSchedule[],
): ScheduledCommitmentAllocation[] => {
  const allocations = [...executions];
  if (!includePending) {
    return allocations;
  }

  for (const schedule of schedules) {
    let plannedForSchedule = 0;

    for (let step = 0; step < MAX_RECURRENCE_STEPS; step += 1) {
      const dates = recurrenceDatesAt(
        schedule.anchorDate,
        schedule.frequency,
        schedule.interval,
        step,
      );
      if (dates.contemplatedDate < schedule.nextContemplatedDate) {
        continue;
      }
      if (dates.contemplatedDate > periodTo || dates.executionDate > periodTo) {
        break;
      }
      if (dates.executionDate < periodFrom) {
        continue;
      }
      if (schedule.endDate !== null && dates.contemplatedDate > schedule.endDate) {
        break;
      }
      if (
        schedule.totalOccurrences !== null &&
        schedule.completedOccurrences + plannedForSchedule >= schedule.totalOccurrences
      ) {
        break;
      }

      allocations.push({
        id: schedule.id * MAX_RECURRENCE_STEPS + step,
        categoryId: schedule.categoryId,
        type: schedule.type as ScheduledCommitmentAllocation['type'],
        amount: schedule.estimatedAmount,
      });
      plannedForSchedule += 1;
    }
  }

  return allocations;
};
