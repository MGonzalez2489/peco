import {todayIsoDate} from './today-iso-date.util';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isFutureDate = (isoDate: string): boolean =>
  ISO_DATE_PATTERN.test(isoDate) && isoDate > todayIsoDate();
