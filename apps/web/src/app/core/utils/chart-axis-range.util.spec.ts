import {calculateChartAxisRange} from './chart-axis-range.util';

describe('calculateChartAxisRange', () => {
  it('keeps zero as the upper bound for an all-negative series', () => {
    const range = calculateChartAxisRange([0, -7778]);

    expect(range.max).toBe(0);
    expect(range.min).toBeLessThan(-7778);
  });

  it('keeps zero as the lower bound for an all-positive series', () => {
    const range = calculateChartAxisRange([0, 7778]);

    expect(range.min).toBe(0);
    expect(range.max).toBeGreaterThan(7778);
  });

  it('pads both sides when the series crosses zero', () => {
    const range = calculateChartAxisRange([-100, 200]);

    expect(range.min).toBe(-130);
    expect(range.max).toBe(230);
  });

  it('centers a flat non-zero series around its value', () => {
    const range = calculateChartAxisRange([500, 500]);

    expect(range.min).toBe(450);
    expect(range.max).toBe(550);
  });

  it('centers an all-zero series around zero', () => {
    const range = calculateChartAxisRange([0, 0]);

    expect(range.min).toBe(-1);
    expect(range.max).toBe(1);
  });

  it('falls back to a zero range when there are no finite values', () => {
    expect(calculateChartAxisRange([])).toEqual({min: 0, max: 0});
    expect(calculateChartAxisRange([Number.NaN])).toEqual({min: 0, max: 0});
  });
});
