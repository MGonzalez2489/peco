import {ACCOUNT_TYPE_MAP} from '../constants/account-type-map.constant';
import {Account} from '../models/account.model';
import {AccountTypeKey} from '../types/account-type-key.enum';

const withIncludeInTotal = (account: Account): Account => ({
  ...account,
  includeInTotal: account.includeInTotal ?? true,
});

const withCreatedAt = (account: Account): Account => ({
  ...account,
  createdAt: account.createdAt ?? new Date().toISOString(),
});

// Accounts persisted before the semantic type refactor stored the type as a
// plain key (e.g. 'CASH'). Resolve those legacy values into the account type
// object so every consumer can read `account.type.color` / `.icon` / `.name`.
const withType = (account: Account): Account => {
  const current: unknown = account.type;
  if (current && typeof current === 'object') return account;

  const key = (typeof current === 'string' ? current : AccountTypeKey.CASH) as AccountTypeKey;
  return {...account, type: ACCOUNT_TYPE_MAP[key] ?? ACCOUNT_TYPE_MAP[AccountTypeKey.CASH]};
};

export const ensureRootAccount = (accounts: Account[]): Account[] => {
  const normalized = accounts.map(withIncludeInTotal).map(withCreatedAt).map(withType);

  if (normalized.length === 0) return normalized;
  if (normalized.some((account) => account.isRoot)) return normalized;

  const [first, ...rest] = normalized;
  return [{...first, isRoot: true}, ...rest];
};
