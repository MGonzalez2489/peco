import {Account} from '../models/account.model';

const withIncludeInTotal = (account: Account): Account => ({
  ...account,
  includeInTotal: account.includeInTotal ?? true,
});

const withCreatedAt = (account: Account): Account => ({
  ...account,
  createdAt: account.createdAt ?? new Date().toISOString(),
});

export const ensureRootAccount = (accounts: Account[]): Account[] => {
  const normalized = accounts.map(withIncludeInTotal).map(withCreatedAt);

  if (normalized.length === 0) return normalized;
  if (normalized.some((account) => account.isRoot)) return normalized;

  const [first, ...rest] = normalized;
  return [{...first, isRoot: true}, ...rest];
};
