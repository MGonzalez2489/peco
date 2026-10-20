/**
 * Computes a padded Y-axis range for a chart series.
 *
 * The extra padding is never applied past zero on the side the series does not
 * cover, so a balance that starts at zero (e.g. an account in its first month)
 * sits exactly on the axis bound instead of floating above an artificial value.
 */
export function calculateChartAxisRange(values: number[]): {min: number; max: number} {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  if (finiteValues.length === 0) return {min: 0, max: 0};

  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);

  if (min === max) {
    const delta = Math.max(Math.abs(min) * 0.1, 1);
    return {min: min - delta, max: min + delta};
  }

  const padding = (max - min) * 0.1;
  let axisMin = min - padding;
  let axisMax = max + padding;

  if (min >= 0 && axisMin < 0) axisMin = 0;
  if (max <= 0 && axisMax > 0) axisMax = 0;

  return {min: axisMin, max: axisMax};
}
