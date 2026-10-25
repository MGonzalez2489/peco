import {isNegativeBalanceAllowed} from './is-negative-balance-allowed.util';

describe('isNegativeBalanceAllowed', () => {
  it('only allows negative balances for credit accounts', () => {
    expect(isNegativeBalanceAllowed('CREDIT')).toBe(true);
    expect(isNegativeBalanceAllowed('CASH')).toBe(false);
    expect(isNegativeBalanceAllowed('DEBIT')).toBe(false);
    expect(isNegativeBalanceAllowed('SAVINGS')).toBe(false);
  });
});
