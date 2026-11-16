import {ACCOUNT_TYPES} from '../constants/account-types.constant';
import {Account} from '../models/account.model';
import {AccountTypeSummary} from '../models/account-type-summary.model';

/**
 * Builds the account type distribution shown on the accounts view. Every
 * canonical account type is always included, even when it has no accounts, so
 * the responsive summaries keep a stable shape and column count.
 */
export function buildAccountTypeDistribution(accounts: Account[]): AccountTypeSummary[] {
  return ACCOUNT_TYPES.map((definition) => {
    const matching = accounts.filter((account) => account.type === definition.key);

    return {
      type: definition.key,
      label: definition.pluralName,
      count: matching.length,
      total: matching.reduce((sum, account) => sum + account.currentBalance, 0),
      color: definition.color,
      icon: definition.icon,
    };
  });
}
