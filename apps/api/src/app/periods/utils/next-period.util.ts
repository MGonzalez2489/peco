/** Returns the calendar month immediately after a valid `YYYY-MM` period. */
export const nextPeriod = (period: string): string => {
  const [year = 0, month = 0] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, month, 1));
  const twoDigits = (value: number): string => String(value).padStart(2, '0');

  return `${date.getUTCFullYear()}-${twoDigits(date.getUTCMonth() + 1)}`;
};
