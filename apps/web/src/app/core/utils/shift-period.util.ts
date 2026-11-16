/** Shifts a `YYYY-MM` period by a number of months (negative values move back). */
export const shiftPeriod = (period: string, months: number): string => {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return '';

  const date = new Date(Number(match[1]), Number(match[2]) - 1 + months, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
