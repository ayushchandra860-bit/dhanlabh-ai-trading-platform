import { engineResult } from '../helpers.js';
import { average, last, round } from '../../utils/math.js';

export function volumeAI(ctx) {
  const recentVolume = ctx.volumes.slice(-25);
  const avg = average(recentVolume.slice(0, -1));
  const now = last(recentVolume, avg || 1);
  const ratio = avg ? now / avg : 1;
  const candle = ctx.lastCandle;
  const body = candle.close - candle.open;
  const obvSlope = ctx.indicators.obv.length > 8 ? last(ctx.indicators.obv, 0) - ctx.indicators.obv.at(-8) : 0;
  const cmf = last(ctx.indicators.cmf20, 0) ?? 0;
  const mfi = last(ctx.indicators.mfi14, 50) ?? 50;
  let score = 0;
  if (body > 0) score += ratio > 1.25 ? 22 : 8;
  if (body < 0) score -= ratio > 1.25 ? 22 : 8;
  if (obvSlope > 0) score += 10;
  if (obvSlope < 0) score -= 10;
  if (cmf > 0.05) score += 10;
  if (cmf < -0.05) score -= 10;
  if (mfi > 72) score += 4;
  if (mfi < 28) score -= 4;
  if (ratio < 0.65) score *= 0.45;
  return engineResult('Volume AI', score, 48 + Math.min(ratio * 18, 36), [
    ratio > 1.4 && 'Volume spike confirms active participation',
    ratio < 0.7 && 'Low volume reduces signal quality',
    body > 0 ? 'Buying pressure on the latest candle' : 'Selling pressure on the latest candle',
    cmf > 0 ? 'Chaikin Money Flow is positive' : 'Chaikin Money Flow is negative',
    `Volume ratio ${round(ratio, 2)}x`
  ], { volumeRatio: ratio, buyingPressure: body > 0, sellingPressure: body < 0, obvSlope, cmf, mfi }, 0.9);
}
