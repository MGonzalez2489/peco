import type {PeriodSnapshotResponseDto} from '../dto/period-snapshot-response.dto';

/** Service result carrying the HTTP status decision of a close request. */
export interface PeriodCloseOutcome {
  snapshot: PeriodSnapshotResponseDto;
  created: boolean;
}
