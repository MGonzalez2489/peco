import {Account} from '../models/account.model';

export const ensureRootAccount = (accounts: Account[]): Account[] => {
  if (accounts.length === 0) return accounts;
  if (accounts.some((account) => account.isRoot)) return accounts;

  const [first, ...rest] = accounts;
  return [{...first, isRoot: true}, ...rest];
};
