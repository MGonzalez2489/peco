import {Movement} from '../models/movement.model';
import {ProgressionPoint} from '../models/progression-point.model';
import {formatShortDate} from './format-short-date.util';
import {isSameMonthAndYear} from './is-same-month-and-year.util';
import {movementBalanceImpact} from './movement-balance-impact.util';

export function calculateEventDrivenProgression(
  movements: Movement[],
  accountId: string,
  selectedYear: number,
  selectedMonth: number,
  initialBalanceBeforeMonth: number,
): ProgressionPoint[] {
  const dailyNet = new Map<string, number>();

  for (const movement of movements) {
    if (!isSameMonthAndYear(movement.date, {month: selectedMonth, year: selectedYear})) continue;

    const impact = movementBalanceImpact(movement, accountId);
    if (impact === 0) continue;

    const day = movement.date.slice(0, 10);
    dailyNet.set(day, (dailyNet.get(day) ?? 0) + impact);
  }

  const firstDay = toIsoDay(new Date(selectedYear, selectedMonth - 1, 1));
  const lastDay = resolveLastVisibleDay(selectedYear, selectedMonth);
  const eventDays = [...dailyNet.entries()].filter(([, net]) => net !== 0).map(([day]) => day);
  const orderedDays = [...new Set([firstDay, lastDay, ...eventDays])]
    .filter((day) => day >= firstDay && day <= lastDay)
    .sort();

  const points: ProgressionPoint[] = [];
  let balance = initialBalanceBeforeMonth;

  for (const day of orderedDays) {
    balance += dailyNet.get(day) ?? 0;
    points.push({x: formatShortDate(day), y: balance});
  }

  return points;
}

function resolveLastVisibleDay(selectedYear: number, selectedMonth: number): string {
  const today = new Date();
  const isCurrentOrFuture =
    selectedYear > today.getFullYear() ||
    (selectedYear === today.getFullYear() && selectedMonth >= today.getMonth() + 1);

  return isCurrentOrFuture ? toIsoDay(today) : toIsoDay(new Date(selectedYear, selectedMonth, 0));
}

function toIsoDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
