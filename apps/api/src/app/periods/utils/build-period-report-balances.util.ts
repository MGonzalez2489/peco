import {buildAccountSummary} from '@peco/utils';
import type {PeriodReportBalanceRow} from '../types/period-report-balance-row.type';
import type {PeriodReportBalances} from '../types/period-report-balances.type';

/**
 * Applies the live account-summary formulas to frozen or ledger rows (11.6/D62).
 * The gross total includes credit and excluded accounts; only the available and
 * liability figures honour `includeInTotal` and the credit-only liability rule.
 */
export const buildPeriodReportBalances = (
  rows: readonly PeriodReportBalanceRow[],
): PeriodReportBalances => {
  const {totalBalance, availableBalance, liabilitiesBalance} = buildAccountSummary(rows);
  return {totalBalance, availableBalance, liabilitiesBalance};
};
