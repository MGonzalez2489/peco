import type {PeriodAccountCalculation} from './period-account-calculation.type';

/** Complete projection of one month derived only from accounts and ledger rows (11.4). */
export interface PeriodCalculation {
  accountBalances: PeriodAccountCalculation[];
  globalInitialBalance: number;
  globalFinalBalance: number;
  totalInflows: number;
  totalOutflows: number;
  totalTransfers: number;
  totalTransactionsCount: number;
}
