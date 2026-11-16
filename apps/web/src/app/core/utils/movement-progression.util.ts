import {Movement} from '../models/movement.model';
import {ProgressionPoint} from '../models/progression-point.model';
import {formatShortDate} from './format-short-date.util';
import {isSameMonthAndYear} from './is-same-month-and-year.util';
import {toIsoDate} from './to-iso-date.util';
import {toLocalIsoDay} from './to-local-iso-day.util';

export function calculateMovementProgression(
  movements: Movement[],
  selectedYear: number,
  selectedMonth: number,
): ProgressionPoint[] {
  const dailyNet = new Map<string, number>();

  for (const movement of movements) {
    if (movement.isCanceled) continue;
    if (movement.type !== 'INCOME' && movement.type !== 'EXPENSE') continue;
    if (!isSameMonthAndYear(movement.date, {month: selectedMonth, year: selectedYear})) continue;

    const impact = movement.type === 'INCOME' ? movement.amount : -movement.amount;
    const day = toLocalIsoDay(movement.date);
    dailyNet.set(day, (dailyNet.get(day) ?? 0) + impact);
  }

  const firstDay = toIsoDate(new Date(selectedYear, selectedMonth - 1, 1));
  const lastDay = resolveLastVisibleDay(selectedYear, selectedMonth);
  const eventDays = [...dailyNet.entries()].filter(([, net]) => net !== 0).map(([day]) => day);
  const orderedDays = [...new Set([firstDay, lastDay, ...eventDays])]
    .filter((day) => day >= firstDay && day <= lastDay)
    .sort();

  const points: ProgressionPoint[] = [];
  let balance = 0;

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

  return isCurrentOrFuture ? toIsoDate(today) : toIsoDate(new Date(selectedYear, selectedMonth, 0));
}
