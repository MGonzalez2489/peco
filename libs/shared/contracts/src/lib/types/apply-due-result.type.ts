import type {ScheduledExecutionStatus} from './scheduled-execution-status.type';

/** One occurrence processed by the on-demand catch-up run (8.11/US-606). */
export interface ApplyDueResult {
  schedulePublicId: string;
  contemplatedDate: string;
  occurrenceDate: string | null;
  status: ScheduledExecutionStatus;
  movementPublicId: string | null;
  reason: string | null;
}
