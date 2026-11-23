import type {ScheduledExecutionStatus} from './scheduled-execution-status.type';

/** Stored outcome of one scheduled occurrence, including the contemplated/applied pair (D56/US-604). */
export interface ScheduledOccurrenceResponse {
  contemplatedDate: string;
  occurrenceDate: string | null;
  status: ScheduledExecutionStatus;
  reason: string | null;
}
