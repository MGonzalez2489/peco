import {Account} from '../models/account.model';
import {isLiability} from './is-liability.util';

/**
 * Computes the credit usage of a liability account (e.g. a credit card).
 *
 * Returns `null` when the account is not a credit account or has no credit
 * limit configured, so callers can fall back to the savings goal UI.
 *
 * The available percentage counts down from 100% as more credit is used,
 * which keeps the progress bar decreasing instead of filling up.
 */
export function getCreditUsage(account: Account): {
  limit: number;
  used: number;
  available: number;
  availablePercentage: number;
} | null {
  const limit = account.creditLimit ?? 0;
  if (!isLiability(account.type) || limit <= 0) return null;

  const used = Math.min(limit, Math.max(0, -account.currentBalance));
  const available = Math.max(0, limit - used);

  return {
    limit,
    used,
    available,
    availablePercentage: Math.min(100, Math.max(0, Math.round((available / limit) * 100))),
  };
}
