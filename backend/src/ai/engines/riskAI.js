import { engineResult, marketQuality } from '../helpers.js';
import { last, round } from '../../utils/math.js';

export function riskAI(ctx) {
  const quality = marketQuality(ctx);
  const atr = last(ctx.indicators.atr14, 0);
  const price = last(ctx.closes, 1);
  const atrPercent = price ? (atr / price) * 100 : 0;
  const score = quality.poor ? 0 : quality.directionSlope * 14;
  const riskPenalty = atrPercent > 0.8 ? 18 : atrPercent < 0.03 ? 12 : 0;
  return {
    ...engineResult('Risk AI', score, 70 - riskPenalty, [
      quality.poor && 'Market quality is poor for new entries',
      quality.volumeRatio < 0.75 && 'Volume confirmation is weak',
      `ATR volatility ${round(atrPercent, 3)}%`,
      `Directional slope ${round(quality.directionSlope, 3)}%`
    ], { ...quality, atrPercent }, 1.15),
    riskLevel: atrPercent > 0.55 || quality.chop > 2.5 ? 'High' : atrPercent > 0.18 ? 'Medium' : 'Low'
  };
}
