import { engineResult } from '../helpers.js';
import { last, round } from '../../utils/math.js';

export function oscillatorAI(ctx) {
  const rsi = last(ctx.indicators.rsi14, 50);
  const stoch = last(ctx.indicators.stochRsi, 50) ?? 50;
  const cci = last(ctx.indicators.cci20, 0) ?? 0;
  const mfi = last(ctx.indicators.mfi14, 50) ?? 50;
  const cmf = last(ctx.indicators.cmf20, 0) ?? 0;
  let score = 0;
  score += rsi > 60 ? 16 : rsi < 40 ? -16 : (rsi - 50) * 0.45;
  score += stoch > 80 ? -6 : stoch < 20 ? 6 : (stoch - 50) * 0.18;
  score += cci > 100 ? 14 : cci < -100 ? -14 : cci * 0.05;
  score += mfi > 78 ? -8 : mfi < 22 ? 8 : (mfi - 50) * 0.22;
  score += cmf > 0.05 ? 10 : cmf < -0.05 ? -10 : cmf * 60;
  const extremes = [rsi > 72 || rsi < 28, stoch > 88 || stoch < 12, mfi > 82 || mfi < 18].filter(Boolean).length;
  const confidence = 50 + Math.min(Math.abs(score), 28) + extremes * 4;
  return engineResult('Oscillator AI', score, confidence, [
    `RSI ${round(rsi, 1)}`,
    `Stochastic RSI ${round(stoch, 1)}`,
    `CCI ${round(cci, 1)}`,
    `MFI ${round(mfi, 1)}`,
    cmf > 0 ? 'CMF shows positive money flow' : 'CMF shows negative money flow'
  ], { rsi, stochRsi: stoch, cci, mfi, cmf, extremes }, 0.95);
}
