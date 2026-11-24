/** Inclusive month count for two valid `YYYY-MM` periods; zero when reversed or malformed. */
export const periodRangeMonthCount = (from: string, to: string): number => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(from) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(to)) {
    return 0;
  }

  const monthIndex = (period: string): number => {
    const [year, month] = period.split('-').map(Number);
    return year * 12 + month - 1;
  };

  return Math.max(0, monthIndex(to) - monthIndex(from) + 1);
};
