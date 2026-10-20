import {ACCOUNT_TYPES} from '../constants/account-types.constant';
import {Account} from '../models/account.model';
import {AccountTypeSummary} from '../models/account-type-summary.model';

/**
 * Builds the distribution summary shown on the accounts view. Only account
 * types that currently have at least one account are returned, ordered by the
 * canonical type list, with their count and signed balance total.
 */
export function groupAccountsByType(accounts: Account[]): AccountTypeSummary[] {
  return ACCOUNT_TYPES.flatMap((definition) => {
    const matching = accounts.filter((account) => account.type === definition.key);
    if (matching.length === 0) return [];

    return [
      {
        type: definition.key,
        label: definition.pluralName,
        count: matching.length,
        total: matching.reduce((total, account) => total + account.currentBalance, 0),
        color: definition.color,
        icon: definition.icon,
      },
    ];
  });
}
