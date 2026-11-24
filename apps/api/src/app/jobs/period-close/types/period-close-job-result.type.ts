import type {PeriodBackfillResult} from '../../../periods/types/period-backfill-result.type';
import type {PeriodCloseTrigger} from './period-close-trigger.type';

/** Outcome of one scheduled or startup period-close run (US-704). */
export interface PeriodCloseJobResult extends PeriodBackfillResult {
  acquired: boolean;
  deferred: boolean;
  trigger: PeriodCloseTrigger;
  postponed: number;
}
