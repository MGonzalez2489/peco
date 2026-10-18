import {ACCOUNT_TYPE_MAP} from '../constants/account-type-map.constant';
import {Account} from '../models/account.model';
import {AccountTypeKey} from '../types/account-type-key.enum';
import {getCreditUsage} from './credit-usage.util';

const buildAccount = (overrides: Partial<Account>): Account => ({
  id: 'account-1',
  name: 'Cuenta',
  currentBalance: 0,
  type: ACCOUNT_TYPE_MAP[AccountTypeKey.CASH],
  includeInTotal: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('getCreditUsage', () => {
  it('returns null for non-credit accounts', () => {
    const usage = getCreditUsage(
      buildAccount({
        type: ACCOUNT_TYPE_MAP[AccountTypeKey.SAVINGS],
        creditLimit: 10000,
      }),
    );

    expect(usage).toBeNull();
  });

  it('returns null when the credit limit is not set', () => {
    const usage = getCreditUsage(
      buildAccount({type: ACCOUNT_TYPE_MAP[AccountTypeKey.CREDIT], currentBalance: -500}),
    );

    expect(usage).toBeNull();
  });

  it('computes the used amount and a decreasing available percentage', () => {
    const usage = getCreditUsage(
      buildAccount({
        type: ACCOUNT_TYPE_MAP[AccountTypeKey.CREDIT],
        currentBalance: -2500,
        creditLimit: 10000,
      }),
    );

    expect(usage).toEqual({
      limit: 10000,
      used: 2500,
      available: 7500,
      availablePercentage: 75,
    });
  });

  it('clamps the usage to the credit limit', () => {
    const usage = getCreditUsage(
      buildAccount({
        type: ACCOUNT_TYPE_MAP[AccountTypeKey.CREDIT],
        currentBalance: -15000,
        creditLimit: 10000,
      }),
    );

    expect(usage).toEqual({
      limit: 10000,
      used: 10000,
      available: 0,
      availablePercentage: 0,
    });
  });

  it('treats a positive balance as no credit usage', () => {
    const usage = getCreditUsage(
      buildAccount({
        type: ACCOUNT_TYPE_MAP[AccountTypeKey.CREDIT],
        currentBalance: 500,
        creditLimit: 10000,
      }),
    );

    expect(usage).toEqual({
      limit: 10000,
      used: 0,
      available: 10000,
      availablePercentage: 100,
    });
  });
});
