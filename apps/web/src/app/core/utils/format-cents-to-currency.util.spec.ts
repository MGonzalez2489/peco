import {formatCentsToCurrency} from './format-cents-to-currency.util';

describe('formatCentsToCurrency', () => {
  it('formats integer cents as US dollars', () => {
    expect(formatCentsToCurrency(0)).toBe('$0.00');
    expect(formatCentsToCurrency(100)).toBe('$1.00');
    expect(formatCentsToCurrency(150050)).toBe('$1,500.50');
    expect(formatCentsToCurrency(-150000)).toBe('-$1,500.00');
  });
});
