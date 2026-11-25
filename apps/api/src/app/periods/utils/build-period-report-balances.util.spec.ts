import {AccountTypeEnum} from '@peco/enums';
import {buildPeriodReportBalances} from './build-period-report-balances.util';

describe('buildPeriodReportBalances (US-705/D62)', () => {
  it('keeps the gross total but excludes credit and excluded accounts from available', () => {
    const balances = buildPeriodReportBalances([
      {type: AccountTypeEnum.CASH.toString(), currentBalance: 130_000, includeInTotal: true},
      {type: AccountTypeEnum.CREDIT.toString(), currentBalance: -35_000, includeInTotal: true},
      {type: AccountTypeEnum.SAVINGS.toString(), currentBalance: 20_000, includeInTotal: false},
    ]);

    expect(balances).toEqual({
      totalBalance: 115_000,
      availableBalance: 130_000,
      liabilitiesBalance: 35_000,
    });
  });

  it('reports no liability for a positive credit balance or an excluded credit', () => {
    const balances = buildPeriodReportBalances([
      {type: AccountTypeEnum.CREDIT.toString(), currentBalance: 5_000, includeInTotal: true},
      {type: AccountTypeEnum.CREDIT.toString(), currentBalance: -9_000, includeInTotal: false},
    ]);

    expect(balances).toEqual({
      totalBalance: -4_000,
      availableBalance: 0,
      liabilitiesBalance: 0,
    });
  });
});
