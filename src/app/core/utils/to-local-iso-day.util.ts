import {toIsoDate} from './to-iso-date.util';

export const toLocalIsoDay = (isoDate: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;

  return toIsoDate(date);
};
