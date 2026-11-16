import {recurrenceLabel} from './recurrence-label.util';

describe('recurrenceLabel', () => {
  it('uses the base label when the interval is 1 or missing', () => {
    expect(recurrenceLabel('MONTHLY')).toBe('Mensual');
    expect(recurrenceLabel('MONTHLY', 1)).toBe('Mensual');
    expect(recurrenceLabel('DAILY')).toBe('Diaria');
  });

  it('builds a repeated label for intervals greater than one', () => {
    expect(recurrenceLabel('MONTHLY', 2)).toBe('Cada 2 meses');
    expect(recurrenceLabel('YEARLY', 3)).toBe('Cada 3 años');
    expect(recurrenceLabel('WEEKLY', 2)).toBe('Cada 2 semanas');
    expect(recurrenceLabel('FORTNIGHTLY', 4)).toBe('Cada 4 quincenas');
  });

  it('falls back to a safe label for unknown frequencies', () => {
    const unknown = 'BIWEEKLY' as unknown as never;
    expect(recurrenceLabel(unknown)).toBe('Sin frecuencia');
  });
});
