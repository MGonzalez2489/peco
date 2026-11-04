/** First and last UTC instants covered by a `YYYY-MM` period. */
export const periodRange = (period: string): {startDate: string; endDate: string} => {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  const year = match ? Number(match[1]) : 0;
  const month = match ? Number(match[2]) : 1;
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)).toISOString();
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();

  return {startDate, endDate};
};
