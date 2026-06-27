import { engineResult } from '../helpers.js';

export function marketStructureAI(ctx) {
  const recent = ctx.candles.slice(-35);
  const highs = recent.map((candle) => candle.high);
  const lows = recent.map((candle) => candle.low);
  const priorHigh = Math.max(...highs.slice(0, -8));
  const recentHigh = Math.max(...highs.slice(-8));
  const priorLow = Math.min(...lows.slice(0, -8));
  const recentLow = Math.min(...lows.slice(-8));
  const higherHigh = recentHigh > priorHigh;
  const higherLow = recentLow > priorLow;
  const lowerHigh = recentHigh < priorHigh;
  const lowerLow = recentLow < priorLow;
  let score = 0;
  if (higherHigh) score += 14;
  if (higherLow) score += 14;
  if (lowerHigh) score -= 14;
  if (lowerLow) score -= 14;
  return engineResult('Market Structure AI', score, 55 + Math.min(Math.abs(score), 26), [
    higherHigh && 'Higher high confirmed',
    higherLow && 'Higher low confirmed',
    lowerHigh && 'Lower high confirmed',
    lowerLow && 'Lower low confirmed'
  ], { higherHigh, higherLow, lowerHigh, lowerLow }, 0.9);
}
