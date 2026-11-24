import type {AccountEntity} from '../../database/entities';

/** Ledger-derived opening, closing and counters for one frozen account row (11.3). */
export interface PeriodAccountCalculation {
  account: AccountEntity;
  openingBalance: number;
  finalBalance: number;
  totalTransactions: number;
  totalInflows: number;
  totalOutflows: number;
  totalTransfers: number;
}
