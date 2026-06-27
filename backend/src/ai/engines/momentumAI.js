import { engineResult } from '../helpers.js';
import { last, round } from '../../utils/math.js';

export function momentumAI(ctx) {
  const rsi = last(ctx.indicators.rsi14, 50);
  const macd = last(ctx.indicators.macd, { histogram: 0, macd: 0, signal: 0 });
  const adx = last(ctx.indicators.adx14, { adx: 0, plusDi: 0, minusDi: 0 });
  const stoch = last(ctx.indicators.stochRsi, 50) ?? 50;
  const roc = last(ctx.indicators.roc12, 0) ?? 0;
  const cci = last(ctx.indicators.cci20, 0) ?? 0;
  let score = 0;
  score += rsi > 58 ? 18 : rsi < 42 ? -18 : (rsi - 50) * 0.7;
  score += macd.histogram > 0 ? 18 : -18;
  score += adx.plusDi > adx.minusDi ? 12 : -12;
  score += stoch > 80 ? 4 : stoch < 20 ? -4 : (stoch - 50) * 0.25;
  score += roc > 0 ? 10 : -10;
  score += cci > 100 ? 8 : cci < -100 ? -8 : cci * 0.03;
  const confidence = 48 + Math.min(Math.abs(rsi - 50), 20) + Math.min(adx.adx, 32);
  return engineResult('Momentum AI', score, confidence, [
    `RSI is ${round(rsi, 1)}`,
    macd.histogram > 0 ? 'MACD histogram supports upside momentum' : 'MACD histogram supports downside momentum',
    adx.adx > 22 ? 'ADX confirms directional strength' : 'ADX shows weak direction',
    `ROC ${round(roc, 3)}% and CCI ${round(cci, 1)}`
  ], { rsi, macdHistogram: macd.histogram, adx: adx.adx, stochRsi: stoch, roc, cci }, 1.15);
}
