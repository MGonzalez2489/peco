import {buildAccountSummary} from '@peco/utils';
import {ACCOUNT_TYPES} from '../constants/account-types.constant';
import {Account} from '../models/account.model';
import {AccountTypeSummary} from '../models/account-type-summary.model';

/**
 * Builds the account type distribution shown on the accounts view. Every
 * canonical account type is always included, even when it has no accounts, so
 * the responsive summaries keep a stable shape and column count.
 */
export function buildAccountTypeDistribution(accounts: Account[]): AccountTypeSummary[] {
  const summaries = buildAccountSummary(accounts).typeSummaries;

  return ACCOUNT_TYPES.map((definition) => {
    const summary = summaries.find((item) => item.type === definition.key);

    return {
      type: definition.key,
      label: definition.pluralName,
      count: summary?.count ?? 0,
      total: summary?.total ?? 0,
      color: definition.color,
      icon: definition.icon,
    };
  });
}
