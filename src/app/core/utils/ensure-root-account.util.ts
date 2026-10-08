import {Account} from '../models/account.model';

const withIncludeInTotal = (account: Account): Account => ({
  ...account,
  includeInTotal: account.includeInTotal ?? true,
});

export const ensureRootAccount = (accounts: Account[]): Account[] => {
  const normalized = accounts.map(withIncludeInTotal);

  if (normalized.length === 0) return normalized;
  if (normalized.some((account) => account.isRoot)) return normalized;

  const [first, ...rest] = normalized;
  return [{...first, isRoot: true}, ...rest];
};
