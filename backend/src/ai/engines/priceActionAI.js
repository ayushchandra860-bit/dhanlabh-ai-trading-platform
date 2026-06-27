import { engineResult, levels } from '../helpers.js';
import { last, round, slope } from '../../utils/math.js';

export function priceActionAI(ctx) {
  const price = last(ctx.closes);
  const { support, resistance } = levels(ctx, 70);
  const range = resistance - support;
  const nearSupport = range ? (price - support) / range < 0.25 : false;
  const nearResistance = range ? (resistance - price) / range < 0.25 : false;
  const recentSlope = slope(ctx.closes.slice(-20));
  const breakout = price > resistance * 0.998;
  const breakdown = price < support * 1.002;
  const fakeBreakout = ctx.previousCandle?.high > resistance && ctx.lastCandle.close < resistance;
  const fakeBreakdown = ctx.previousCandle?.low < support && ctx.lastCandle.close > support;
  let score = recentSlope * 18;
  if (breakout) score += 18;
  if (breakdown) score -= 18;
  if (nearSupport) score += 9;
  if (nearResistance) score -= 9;
  if (fakeBreakout) score -= 16;
  if (fakeBreakdown) score += 16;
  return engineResult('Price Action AI', score, 58 + Math.min(Math.abs(recentSlope) * 42, 25) + (breakout || breakdown ? 10 : 0), [
    breakout && 'Breakout pressure near recent resistance',
    breakdown && 'Breakdown pressure near recent support',
    fakeBreakout && 'Possible fake breakout detected',
    fakeBreakdown && 'Possible fake breakdown detected',
    `Support ${round(support, 5)} / resistance ${round(resistance, 5)}`
  ], { support, resistance, breakout, fakeBreakout, consolidation: Math.abs(recentSlope) < 0.04 }, 1.1);
}
