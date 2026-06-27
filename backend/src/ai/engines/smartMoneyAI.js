import { engineResult, levels } from '../helpers.js';
import { last } from '../../utils/math.js';

export function smartMoneyAI(ctx) {
  const price = last(ctx.closes);
  const recent = ctx.candles.slice(-50);
  const { support, resistance } = levels(ctx, 90);
  const impulsive = recent.filter((candle) => Math.abs(candle.close - candle.open) > last(ctx.indicators.atr14, 0) * 0.75);
  const bullishOrderBlock = impulsive.slice(-8).find((candle) => candle.close > candle.open && price > candle.low);
  const bearishOrderBlock = impulsive.slice(-8).find((candle) => candle.close < candle.open && price < candle.high);
  const fairValueGapUp = recent.slice(-12).some((candle, index, arr) => index > 1 && candle.low > arr[index - 2].high);
  const fairValueGapDown = recent.slice(-12).some((candle, index, arr) => index > 1 && candle.high < arr[index - 2].low);
  const bosUp = price > resistance;
  const bosDown = price < support;
  const liquiditySweepDown = ctx.lastCandle.low < support && ctx.lastCandle.close > support;
  const liquiditySweepUp = ctx.lastCandle.high > resistance && ctx.lastCandle.close < resistance;
  const recentHighs = recent.slice(-18).map((candle) => candle.high);
  const recentLows = recent.slice(-18).map((candle) => candle.low);
  const equalHighs = recentHighs.filter((high) => Math.abs(high - Math.max(...recentHighs)) / price < 0.0012).length >= 2;
  const equalLows = recentLows.filter((low) => Math.abs(low - Math.min(...recentLows)) / price < 0.0012).length >= 2;
  const chochUp = ctx.previousCandle?.close < support && ctx.lastCandle.close > support;
  const chochDown = ctx.previousCandle?.close > resistance && ctx.lastCandle.close < resistance;
  const supplyZone = resistance;
  const demandZone = support;
  const institutionalArea = Boolean(bullishOrderBlock || bearishOrderBlock || fairValueGapUp || fairValueGapDown || equalHighs || equalLows);
  let score = 0;
  if (bullishOrderBlock) score += 12;
  if (bearishOrderBlock) score -= 12;
  if (fairValueGapUp) score += 8;
  if (fairValueGapDown) score -= 8;
  if (bosUp || liquiditySweepDown) score += 18;
  if (bosDown || liquiditySweepUp) score -= 18;
  if (chochUp) score += 12;
  if (chochDown) score -= 12;
  if (equalLows && price > support) score += 6;
  if (equalHighs && price < resistance) score -= 6;
  return engineResult('Smart Money AI', score, 56 + Math.min(Math.abs(score), 26), [
    bullishOrderBlock && 'Bullish order-block area remains respected',
    bearishOrderBlock && 'Bearish order-block area remains respected',
    fairValueGapUp && 'Bullish fair-value gap detected',
    fairValueGapDown && 'Bearish fair-value gap detected',
    bosUp && 'Break of structure to the upside',
    bosDown && 'Break of structure to the downside',
    chochUp && 'CHOCH recovery above demand',
    chochDown && 'CHOCH rejection below supply',
    liquiditySweepDown && 'Sell-side liquidity sweep with recovery',
    liquiditySweepUp && 'Buy-side liquidity sweep with rejection',
    equalHighs && 'Buy-side liquidity pool near supply',
    equalLows && 'Sell-side liquidity pool near demand'
  ], { fairValueGapUp, fairValueGapDown, bosUp, bosDown, chochUp, chochDown, liquiditySweepDown, liquiditySweepUp, equalHighs, equalLows, supplyZone, demandZone, institutionalArea }, 1.05);
}
