import {isLiability} from './is-liability.util';

describe('isLiability', () => {
  it('flags credit accounts as liabilities', () => {
    expect(isLiability('CREDIT')).toBe(true);
  });

  it('does not flag cash, debit or savings accounts as liabilities', () => {
    expect(isLiability('CASH')).toBe(false);
    expect(isLiability('DEBIT')).toBe(false);
    expect(isLiability('SAVINGS')).toBe(false);
  });
});
