import type {ScheduledTransactionEntity} from '../../database/entities';

/** Schedule-only fields written by a pause/resume toggle (10.8/US-603). */
export interface ScheduledTransactionActiveValues {
  active: boolean;
  nextContemplatedDate: ScheduledTransactionEntity['nextContemplatedDate'];
  nextExecutionDate: ScheduledTransactionEntity['nextExecutionDate'];
}
