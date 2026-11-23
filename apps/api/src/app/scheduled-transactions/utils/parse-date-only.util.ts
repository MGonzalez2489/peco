/** Parses a strict UTC calendar date, rejecting impossible dates such as `2026-02-30`. */
export const parseDateOnly = (value: string): {year: number; month: number; day: number} => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new RangeError(`Invalid UTC calendar date: ${value}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid UTC calendar date: ${value}`);
  }

  return {year, month, day};
};
