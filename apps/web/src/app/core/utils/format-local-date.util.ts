import {toLocalIsoDay} from './to-local-iso-day.util';

export const formatLocalDate = (isoDate: string): string => {
  const [year, month, day] = toLocalIsoDay(isoDate).split('-').map(Number);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
};
