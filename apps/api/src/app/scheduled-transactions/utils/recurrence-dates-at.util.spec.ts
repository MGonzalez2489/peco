import {RecurrenceFrequencyEnum} from '@peco/enums';
import {recurrenceDatesAt} from './recurrence-dates-at.util';

const MONTHLY = RecurrenceFrequencyEnum.MONTHLY.toString();

describe('recurrence grid (10.2/10.3/US-601)', () => {
  it('keeps month-end anchors and moves only weekend contemplated dates to Friday', () => {
    const applied = [
      '2026-01-30',
      '2026-02-27',
      '2026-03-31',
      '2026-04-30',
      '2026-05-29',
      '2026-06-30',
    ];

    applied.forEach((executionDate, step) => {
      expect(recurrenceDatesAt('2026-01-31', MONTHLY, 1, step)).toEqual({
        contemplatedDate: [
          '2026-01-31',
          '2026-02-28',
          '2026-03-31',
          '2026-04-30',
          '2026-05-31',
          '2026-06-30',
        ][step],
        executionDate,
      });
    });
  });

  it('does not apply the business-day rule when the anchor is not the last day', () => {
    expect(recurrenceDatesAt('2026-01-30', MONTHLY, 1, 1)).toEqual({
      contemplatedDate: '2026-02-28',
      executionDate: '2026-02-28',
    });
  });

  it('restores February 29 after clamped leap-day years', () => {
    const yearly = RecurrenceFrequencyEnum.YEARLY.toString();

    expect(
      [1, 2, 3, 4].map((step) => recurrenceDatesAt('2028-02-29', yearly, 1, step)),
    ).toEqual([
      {contemplatedDate: '2029-02-28', executionDate: '2029-02-28'},
      {contemplatedDate: '2030-02-28', executionDate: '2030-02-28'},
      {contemplatedDate: '2031-02-28', executionDate: '2031-02-28'},
      {contemplatedDate: '2032-02-29', executionDate: '2032-02-27'},
    ]);
  });

  it('keeps exact dates for non-monthly frequencies even on weekends', () => {
    const daily = RecurrenceFrequencyEnum.DAILY.toString();
    const weekly = RecurrenceFrequencyEnum.WEEKLY.toString();

    expect(recurrenceDatesAt('2026-01-31', daily, 1, 1)).toEqual({
      contemplatedDate: '2026-02-01',
      executionDate: '2026-02-01',
    });
    expect(recurrenceDatesAt('2026-01-31', weekly, 2, 1)).toEqual({
      contemplatedDate: '2026-02-14',
      executionDate: '2026-02-14',
    });
  });

  it('applies the interval to the grid step', () => {
    expect(recurrenceDatesAt('2026-01-31', MONTHLY, 2, 2)).toEqual({
      contemplatedDate: '2026-05-31',
      executionDate: '2026-05-29',
    });
  });

  it('rejects impossible calendar dates and negative steps', () => {
    expect(() => recurrenceDatesAt('2026-02-30', MONTHLY, 1, 0)).toThrow(RangeError);
    expect(() => recurrenceDatesAt('2026-01-31', MONTHLY, 1, -1)).toThrow(RangeError);
  });
});
