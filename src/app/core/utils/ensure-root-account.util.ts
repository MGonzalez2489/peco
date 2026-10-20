import {ACCOUNT_TYPE_MAP} from '../constants/account-type-map.constant';
import {Account} from '../models/account.model';
import {AccountType} from '../types/account-type.type';

const withIncludeInTotal = (account: Account): Account => ({
  ...account,
  includeInTotal: account.includeInTotal ?? true,
});

const withCreatedAt = (account: Account): Account => ({
  ...account,
  createdAt: account.createdAt ?? new Date().toISOString(),
});

const isAccountType = (value: unknown): value is AccountType =>
  typeof value === 'string' && Object.hasOwn(ACCOUNT_TYPE_MAP, value);

// Accounts persisted before the semantic type refactor stored the type as an
// object (e.g. `{key: 'CASH', color: 'emerald'}`). Normalize both legacy shapes
// into the canonical account type key used across the application.
const withType = (account: Account): Account => {
  const current: unknown = (account as {type?: unknown}).type;
  if (isAccountType(current)) return account;

  const legacyKey = (current as {key?: unknown} | null | undefined)?.key;
  return {...account, type: isAccountType(legacyKey) ? legacyKey : 'CASH'};
};

export const ensureRootAccount = (accounts: Account[]): Account[] => {
  const normalized = accounts.map(withIncludeInTotal).map(withCreatedAt).map(withType);

  if (normalized.length === 0) return normalized;
  if (normalized.some((account) => account.isRoot)) return normalized;

  const [first, ...rest] = normalized;
  return [{...first, isRoot: true}, ...rest];
};
