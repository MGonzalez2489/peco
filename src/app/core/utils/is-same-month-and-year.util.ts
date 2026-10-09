export const isSameMonthAndYear = (
  isoDate: string,
  period: {month: number; year: number},
): boolean => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return false;
  return date.getMonth() + 1 === period.month && date.getFullYear() === period.year;
};
