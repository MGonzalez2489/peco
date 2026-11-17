import {numberTransformer} from './number.transformer';
import {stringTransformer} from './string.transformer';

describe('stringTransformer', () => {
  it('passes UTC strings through in both directions', () => {
    const value = '2026-11-17T12:34:56.789Z';

    expect(stringTransformer.to(value)).toBe(value);
    expect(stringTransformer.from(value)).toBe(value);
  });

  it('normalizes null and undefined to null', () => {
    expect(stringTransformer.to(undefined)).toBeNull();
    expect(stringTransformer.to(null)).toBeNull();
    expect(stringTransformer.from(undefined)).toBeNull();
  });

  it('rejects values that are not strings', () => {
    expect(() => stringTransformer.to(new Date())).toThrow(TypeError);
    expect(() => stringTransformer.from(42)).toThrow(TypeError);
  });
});

describe('numberTransformer', () => {
  it('converts MySQL BIGINT strings to safe integers', () => {
    expect(numberTransformer.from('150000')).toBe(150000);
    expect(numberTransformer.to(150000)).toBe(150000);
  });

  it('normalizes null and undefined to null', () => {
    expect(numberTransformer.to(undefined)).toBeNull();
    expect(numberTransformer.from(null)).toBeNull();
  });

  it('rejects values outside the safe integer range', () => {
    expect(() => numberTransformer.from('9007199254740992')).toThrow(TypeError);
    expect(() => numberTransformer.to(1.5)).toThrow(TypeError);
  });
});
