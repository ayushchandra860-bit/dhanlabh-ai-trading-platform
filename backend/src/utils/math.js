export const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
export const round = (value, digits = 2) => Number(Number(value || 0).toFixed(digits));
export const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
export const last = (values, fallback = undefined) => values.length ? values[values.length - 1] : fallback;

export function standardDeviation(values) {
  if (!values.length) return 0;
  const avg = average(values);
  return Math.sqrt(average(values.map((value) => (value - avg) ** 2)));
}

export function slope(values) {
  if (values.length < 2) return 0;
  const first = values[0];
  const end = values[values.length - 1];
  return first === 0 ? 0 : ((end - first) / Math.abs(first)) * 100;
}

export function percentile(values, target) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp(Math.floor((target / 100) * (sorted.length - 1)), 0, sorted.length - 1);
  return sorted[index];
}
