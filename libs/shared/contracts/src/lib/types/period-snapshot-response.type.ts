import type {AccountPeriodBalanceResponse} from './account-period-balance-response.type';
import type {PeriodSummaryResponse} from './period-summary-response.type';

/** Full immutable snapshot with its frozen account breakdown (8.12). */
export interface PeriodSnapshotResponse extends PeriodSummaryResponse {
  accountBalances: AccountPeriodBalanceResponse[];
}
