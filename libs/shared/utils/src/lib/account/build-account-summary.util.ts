import type {
  AccountResponse,
  AccountSummary,
  AccountType,
  AccountTypeSummary,
} from '@peco/contracts';
import {AccountTypeEnum} from '@peco/enums';
import {isLiabilityAccount} from './is-liability-account.util';

type SummaryAccount = Pick<AccountResponse, 'type' | 'currentBalance' | 'includeInTotal'>;

const ACCOUNT_TYPES: readonly AccountType[] = [
  AccountTypeEnum.CASH.toString(),
  AccountTypeEnum.DEBIT.toString(),
  AccountTypeEnum.CREDIT.toString(),
  AccountTypeEnum.SAVINGS.toString(),
];

/** Computes every account summary figure from the same account snapshot (8.8, D65, D62). */
export const buildAccountSummary = (accounts: readonly SummaryAccount[]): AccountSummary => {
  const totalBalance = accounts.reduce((total, account) => total + account.currentBalance, 0);
  const includedAccounts = accounts.filter((account) => account.includeInTotal !== false);
  const availableBalance = includedAccounts
    .filter((account) => !isLiabilityAccount(account.type))
    .reduce((total, account) => total + account.currentBalance, 0);
  const liabilitiesBalance = includedAccounts
    .filter((account) => isLiabilityAccount(account.type))
    .reduce((total, account) => total + Math.max(0, -account.currentBalance), 0);
  const typeSummaries: AccountTypeSummary[] = ACCOUNT_TYPES.map((type) => {
    const matching = accounts.filter((account) => account.type === type);

    return {
      type,
      count: matching.length,
      total: matching.reduce((total, account) => total + account.currentBalance, 0),
    };
  });

  return {totalBalance, availableBalance, liabilitiesBalance, typeSummaries};
};
