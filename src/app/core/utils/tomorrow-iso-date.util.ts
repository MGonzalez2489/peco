import {toIsoDate} from './to-iso-date.util';

export const tomorrowIsoDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toIsoDate(date);
};
