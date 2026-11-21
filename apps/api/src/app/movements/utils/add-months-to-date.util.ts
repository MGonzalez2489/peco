/** Calendar-safe `YYYY-MM-DD` plus whole months, clamped to the target month's last day. */
export const addMonthsToDate = (date: string, months: number): string => {
  const [sourceYear = 0, sourceMonth = 0, sourceDay = 0] = date.split('-').map(Number);
  const target = new Date(Date.UTC(sourceYear, sourceMonth - 1 + months, 1));
  const year = target.getUTCFullYear();
  const month = target.getUTCMonth() + 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(sourceDay, daysInMonth);

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
