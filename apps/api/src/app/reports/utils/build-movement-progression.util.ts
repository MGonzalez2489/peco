import type {
  MovementProgressionPoint,
  MovementProgressionTotals,
} from '@peco/contracts';
import {MovementTypeEnum} from '@peco/enums';
import type {MovementProgressionRow} from '../types/movement-progression-row.type';

type FrozenTotals = {
  totalInflows: number;
  totalOutflows: number;
};

const utcDaysOfMonth = (period: string): string[] => {
  const [year = 0, month = 0] = period.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return Array.from(
    {length: lastDay},
    (_unused, index) => `${period}-${String(index + 1).padStart(2, '0')}`,
  );
};

/**
 * Builds one cumulative point per UTC day. Days without effective movements keep
 * the previous net, matching 21.11 while preserving the §8.13 wire shape.
 * Transfers and canceled rows never change the global income/expense totals (D63).
 */
export const buildMovementProgression = (
  period: string,
  movements: readonly MovementProgressionRow[],
  excludeReversals: boolean,
  frozenTotals?: FrozenTotals,
): {points: MovementProgressionPoint[]; totals: MovementProgressionTotals} => {
  const dailyNet = new Map<string, number>();
  let income = 0;
  let expenses = 0;

  for (const movement of movements) {
    if (movement.isCanceled) {
      continue;
    }
    if (excludeReversals && (movement.isReversal || movement.isReversed)) {
      continue;
    }

    const isIncome = movement.type === MovementTypeEnum.INCOME.toString();
    const isExpense = movement.type === MovementTypeEnum.EXPENSE.toString();
    if (!isIncome && !isExpense) {
      continue;
    }

    const delta = isIncome ? movement.amount : -movement.amount;
    if (isIncome) {
      income += movement.amount;
    } else {
      expenses += movement.amount;
    }

    const day = movement.date.slice(0, 10);
    dailyNet.set(day, (dailyNet.get(day) ?? 0) + delta);
  }

  const totals: MovementProgressionTotals = frozenTotals
    ? {
        totalIncome: frozenTotals.totalInflows,
        totalExpenses: frozenTotals.totalOutflows,
        netBalance: frozenTotals.totalInflows - frozenTotals.totalOutflows,
      }
    : {totalIncome: income, totalExpenses: expenses, netBalance: income - expenses};

  let cumulative = 0;
  const points = utcDaysOfMonth(period).map((date) => {
    cumulative += dailyNet.get(date) ?? 0;
    return {date, net: cumulative};
  });
  if (points.length > 0) {
    points[points.length - 1].net = totals.netBalance;
  }

  return {points, totals};
};
