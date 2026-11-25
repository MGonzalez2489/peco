import type {
  AccountProgressionCreditUsage,
  AccountType,
} from '@peco/contracts';
import {isLiabilityAccount} from '@peco/utils';

/**
 * Credit capacity at the month end. A non-credit account or a missing limit has
 * no capacity to report, so the public `creditUsage` field stays null (8.13).
 */
export const buildAccountCreditUsage = (
  type: AccountType,
  creditLimit: number | null,
  finalBalance: number,
): AccountProgressionCreditUsage | null => {
  if (!isLiabilityAccount(type) || creditLimit === null || creditLimit <= 0) {
    return null;
  }

  const used = Math.min(creditLimit, Math.max(0, -finalBalance));
  const available = Math.max(0, creditLimit - used);

  return {
    limit: creditLimit,
    used,
    available,
    availablePercentage: Math.min(
      100,
      Math.max(0, Math.round((available / creditLimit) * 100)),
    ),
  };
};
