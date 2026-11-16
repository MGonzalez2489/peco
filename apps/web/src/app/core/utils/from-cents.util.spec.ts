import {fromCents} from './from-cents.util';

describe('fromCents', () => {
  it('converts integer cents back to the decimal input value', () => {
    expect(fromCents(0)).toBe(0);
    expect(fromCents(100)).toBe(1);
    expect(fromCents(150000)).toBe(1500);
    expect(fromCents(1999)).toBe(19.99);
    expect(fromCents(-150000)).toBe(-1500);
  });

  it('falls back to zero for non-finite values', () => {
    expect(fromCents(Number.NaN)).toBe(0);
    expect(fromCents(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
