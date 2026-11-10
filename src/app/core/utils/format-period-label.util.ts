const SPANISH_MONTH_FORMATTER = new Intl.DateTimeFormat('es-ES', {month: 'long'});

/**
 * Formats a `YYYY-MM` period as a Spanish label.
 *
 * `long` returns `Noviembre 2026` for desktop headers and `compact` returns
 * `11 / 2026` for the narrow mobile pill.
 */
export const formatPeriodLabel = (period: string, style: 'long' | 'compact'): string => {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return '';

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return '';

  if (style === 'compact') {
    return `${String(month).padStart(2, '0')} / ${year}`;
  }

  const name = SPANISH_MONTH_FORMATTER.format(new Date(year, month - 1, 1));

  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
};
