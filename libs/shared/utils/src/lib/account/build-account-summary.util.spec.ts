import type {AccountResponse, AccountSummary, AccountType} from '@peco/contracts';
import {AccountTypeEnum} from '@peco/enums';
import {buildAccountSummary} from './build-account-summary.util';
import {isLiabilityAccount} from './is-liability-account.util';

type SummaryAccount = Pick<AccountResponse, 'type' | 'currentBalance' | 'includeInTotal'>;

const TYPES: readonly AccountType[] = [
  AccountTypeEnum.CASH.toString(),
  AccountTypeEnum.DEBIT.toString(),
  AccountTypeEnum.CREDIT.toString(),
  AccountTypeEnum.SAVINGS.toString(),
];

const VARIANTS: readonly SummaryAccount[] = TYPES.flatMap((type) =>
  [-150000, 0, 25000, 500000].flatMap((currentBalance) =>
    [true, false].map((includeInTotal) => ({type, currentBalance, includeInTotal})),
  ),
);

/** Deterministic pseudo-random portfolios so failures are reproducible. */
const sample = (seed: number, size: number): SummaryAccount[] =>
  Array.from({length: size}, (_, offset) => VARIANTS[(seed * 7 + offset * 11) % VARIANTS.length]);

const referenceSummary = (accounts: readonly SummaryAccount[]): AccountSummary => {
  let totalBalance = 0;
  let availableBalance = 0;
  let liabilitiesBalance = 0;

  for (const account of accounts) {
    totalBalance += account.currentBalance;

    if (account.includeInTotal === false) {
      continue;
    }

    if (account.type === AccountTypeEnum.CREDIT.toString()) {
      liabilitiesBalance += Math.max(0, -account.currentBalance);
    } else {
      availableBalance += account.currentBalance;
    }
  }

  return {
    totalBalance,
    availableBalance,
    liabilitiesBalance,
    typeSummaries: TYPES.map((type) => {
      const matching = accounts.filter((account) => account.type === type);

      return {
        type,
        count: matching.length,
        total: matching.reduce((total, account) => total + account.currentBalance, 0),
      };
    }),
  };
};

describe('buildAccountSummary', () => {
  it('flags only credit accounts as liabilities', () => {
    expect(isLiabilityAccount(AccountTypeEnum.CREDIT.toString())).toBe(true);
    expect(isLiabilityAccount(AccountTypeEnum.CASH.toString())).toBe(false);
    expect(isLiabilityAccount(AccountTypeEnum.DEBIT.toString())).toBe(false);
    expect(isLiabilityAccount(AccountTypeEnum.SAVINGS.toString())).toBe(false);
  });

  it('returns zeroed summaries when there are no accounts', () => {
    expect(buildAccountSummary([])).toEqual(referenceSummary([]));
  });

  it('treats a missing includeInTotal flag as included for legacy payloads', () => {
    const legacyAccount = {
      type: AccountTypeEnum.CASH.toString(),
      currentBalance: 25000,
      includeInTotal: undefined,
    } as unknown as SummaryAccount;

    expect(buildAccountSummary([legacyAccount]).availableBalance).toBe(25000);
  });

  it('matches the reference formulas for deterministic generated portfolios', () => {
    for (let seed = 0; seed < 120; seed += 1) {
      for (let size = 0; size <= 4; size += 1) {
        const accounts = sample(seed, size);
        const summary = buildAccountSummary(accounts);

        expect(summary).toEqual(referenceSummary(accounts));
        expect(summary.totalBalance).toBe(
          summary.typeSummaries.reduce((total, item) => total + item.total, 0),
        );
      }
    }
  });
});
