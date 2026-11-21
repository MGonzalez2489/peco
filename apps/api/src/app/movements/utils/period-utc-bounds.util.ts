/** Inclusive UTC bounds of a `YYYY-MM` period; `to` covers the whole last day (8.4). */
export const periodUtcBounds = (period: string): {from: string; to: string} => {
  const [year = 0, month = 0] = period.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const twoDigits = (value: number): string => String(value).padStart(2, '0');

  return {
    from: `${year}-${twoDigits(month)}-01T00:00:00.000Z`,
    to: `${year}-${twoDigits(month)}-${twoDigits(lastDay)}T23:59:59.999Z`,
  };
};
