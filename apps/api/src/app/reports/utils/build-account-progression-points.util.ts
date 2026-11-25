import type {AccountProgressionPoint} from '@peco/contracts';
import type {PeriodLedgerMovement} from '../../periods/types/period-ledger-movement.type';
import {movementBalanceImpact} from '../../movements/utils/movement-balance-impact.util';

/**
 * Builds the opening point and one point per non-canceled movement that touches
 * the account. The authoritative month-end balance is written to the last point
 * so the series always closes on the frozen final balance or live balance.
 */
export const buildAccountProgressionPoints = (
  period: string,
  accountId: number,
  openingBalance: number,
  finalBalance: number,
  movements: readonly PeriodLedgerMovement[],
): AccountProgressionPoint[] => {
  const points: AccountProgressionPoint[] = [
    {date: `${period}-01`, balance: openingBalance},
  ];
  let balance = openingBalance;

  for (const movement of movements) {
    if (movement.isCanceled) {
      continue;
    }

    const delta =
      movementBalanceImpact(
        movement.type,
        movement.amount,
        movement.accountId,
        movement.targetAccountId,
      ).get(accountId) ?? 0;

    if (delta === 0) {
      continue;
    }

    balance += delta;
    points.push({date: movement.date.slice(0, 10), balance});
  }

  points[points.length - 1].balance = finalBalance;
  return points;
};
