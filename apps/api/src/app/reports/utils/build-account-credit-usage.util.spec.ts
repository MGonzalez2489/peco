import {AccountTypeEnum} from '@peco/enums';
import {buildAccountCreditUsage} from './build-account-credit-usage.util';

describe('buildAccountCreditUsage (US-802)', () => {
  it('returns null for a non-credit account or a missing limit', () => {
    expect(
      buildAccountCreditUsage(AccountTypeEnum.CASH.toString(), 500_000, -100_000),
    ).toBeNull();
    expect(
      buildAccountCreditUsage(AccountTypeEnum.CREDIT.toString(), null, -100_000),
    ).toBeNull();
  });

  it('clamps usage and the available percentage to the configured limit', () => {
    expect(
      buildAccountCreditUsage(AccountTypeEnum.CREDIT.toString(), 500_000, -700_000),
    ).toEqual({
      limit: 500_000,
      used: 500_000,
      available: 0,
      availablePercentage: 0,
    });
    expect(
      buildAccountCreditUsage(AccountTypeEnum.CREDIT.toString(), 500_000, 50_000),
    ).toEqual({
      limit: 500_000,
      used: 0,
      available: 500_000,
      availablePercentage: 100,
    });
  });
});
