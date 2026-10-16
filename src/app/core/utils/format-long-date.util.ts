import {formatLocalTime} from './format-local-time.util';

const WEEKDAY_FORMAT = new Intl.DateTimeFormat('es-ES', {weekday: 'long'});
const MONTH_FORMAT = new Intl.DateTimeFormat('es-ES', {month: 'long'});

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Formats an ISO timestamp as a long, human-readable Spanish date with time.
 * Example: `"Viernes, 16 de Octubre de 2026 • 06:50 AM"`.
 */
export const formatLongDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;

  const weekday = capitalize(WEEKDAY_FORMAT.format(date));
  const month = capitalize(MONTH_FORMAT.format(date));
  const base = `${weekday}, ${date.getDate()} de ${month} de ${date.getFullYear()}`;
  const time = formatLocalTime(isoDate);

  return time ? `${base} • ${time}` : base;
};
