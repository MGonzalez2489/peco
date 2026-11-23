/** Formats a UTC `Date` as `YYYY-MM-DD` without consulting local time. */
export const formatDateOnly = (value: Date): string =>
  `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(
    value.getUTCDate(),
  ).padStart(2, '0')}`;
