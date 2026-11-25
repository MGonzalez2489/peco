import type {AccountType} from '@peco/contracts';

/** One frozen or ledger-derived account row feeding the shared balance formulas. */
export interface PeriodReportBalanceRow {
  type: AccountType;
  currentBalance: number;
  includeInTotal: boolean;
}
