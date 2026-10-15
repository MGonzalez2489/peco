import {AccountTypeKey} from '../types/account-type-key.enum';
import {isLiability} from './is-liability.util';

describe('isLiability', () => {
  it('flags credit accounts as liabilities', () => {
    expect(isLiability(AccountTypeKey.CREDIT)).toBe(true);
  });

  it('does not flag cash, debit or savings accounts as liabilities', () => {
    expect(isLiability(AccountTypeKey.CASH)).toBe(false);
    expect(isLiability(AccountTypeKey.DEBIT)).toBe(false);
    expect(isLiability(AccountTypeKey.SAVINGS)).toBe(false);
  });
});
