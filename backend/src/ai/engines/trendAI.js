import { engineResult } from '../helpers.js';
import { last, round } from '../../utils/math.js';

export function trendAI(ctx) {
  const price = last(ctx.closes);
  const ema9 = last(ctx.indicators.ema9);
  const ema20 = last(ctx.indicators.ema20);
  const ema50 = last(ctx.indicators.ema50);
  const ema100 = last(ctx.indicators.ema100);
  const ema200 = last(ctx.indicators.ema200);
  const supertrend = last(ctx.indicators.supertrend, { direction: 'WAIT', value: price });
  const ichimoku = last(ctx.indicators.ichimoku, { tenkan: price, kijun: price, spanA: price, spanB: price });
  const sar = last(ctx.indicators.parabolicSar, { direction: 'WAIT', value: price });
  const bullishStack = ema20 > ema50 && ema50 > ema100 && ema100 > ema200;
  const bearishStack = ema20 < ema50 && ema50 < ema100 && ema100 < ema200;
  const cloudTop = Math.max(ichimoku.spanA, ichimoku.spanB);
  const cloudBottom = Math.min(ichimoku.spanA, ichimoku.spanB);
  let score = 0;
  score += price > ema9 ? 8 : -8;
  score += price > ema20 ? 12 : -12;
  score += ema20 > ema50 ? 16 : -16;
  score += ema50 > ema100 ? 10 : -10;
  score += ema100 > ema200 ? 8 : -8;
  score += supertrend.direction === 'BUY' ? 12 : -12;
  score += sar.direction === 'BUY' ? 8 : -8;
  score += price > cloudTop ? 10 : price < cloudBottom ? -10 : 0;
  score += ichimoku.tenkan > ichimoku.kijun ? 6 : -6;
  if (bullishStack || bearishStack) score *= 1.18;
  const spread = Math.abs(ema20 - ema200) / price * 100;
  const confidence = 54 + Math.min(spread * 80, 28) + (bullishStack || bearishStack ? 10 : 0);
  return engineResult('Trend AI', score, confidence, [
    price > ema9 ? 'Price is above EMA 9' : 'Price is below EMA 9',
    bullishStack && 'EMA 20/50/100/200 are bullishly aligned',
    bearishStack && 'EMA 20/50/100/200 are bearishly aligned',
    price > ema20 ? 'Price is holding above EMA 20' : 'Price is trading below EMA 20',
    supertrend.direction === 'BUY' ? 'Supertrend supports bullish continuation' : 'Supertrend supports bearish continuation',
    price > cloudTop ? 'Price is above Ichimoku cloud' : price < cloudBottom ? 'Price is below Ichimoku cloud' : 'Price is inside Ichimoku cloud',
    `EMA spread strength ${round(spread, 3)}%`
  ], { ema9, ema20, ema50, ema100, ema200, supertrend, ichimoku, parabolicSar: sar, trendStrength: spread > 0.35 ? 'Strong' : spread > 0.12 ? 'Medium' : 'Weak' }, 1.25);
}
