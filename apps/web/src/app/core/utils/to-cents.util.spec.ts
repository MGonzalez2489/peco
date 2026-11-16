import {toCents} from './to-cents.util';

describe('toCents', () => {
  it('converts decimal amounts to integer cents', () => {
    expect(toCents(0)).toBe(0);
    expect(toCents(1)).toBe(100);
    expect(toCents(1500)).toBe(150000);
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(-1500)).toBe(-150000);
  });

  it('absorbs binary floating point representation errors', () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(1.1 + 2.2)).toBe(330);
  });

  it('falls back to zero for non-finite values', () => {
    expect(toCents(Number.NaN)).toBe(0);
    expect(toCents(Number.POSITIVE_INFINITY)).toBe(0);
    expect(toCents(Number.NEGATIVE_INFINITY)).toBe(0);
  });
});
