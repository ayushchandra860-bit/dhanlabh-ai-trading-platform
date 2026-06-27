import { engineResult } from '../helpers.js';

const body = (candle) => Math.abs(candle.close - candle.open);
const range = (candle) => Math.max(candle.high - candle.low, 0.0000001);
const upperWick = (candle) => candle.high - Math.max(candle.open, candle.close);
const lowerWick = (candle) => Math.min(candle.open, candle.close) - candle.low;
const bullish = (candle) => candle.close > candle.open;
const bearish = (candle) => candle.close < candle.open;

export function candlestickAI(ctx) {
  const candles = ctx.candles;
  if (!candles.length || !ctx.lastCandle) {
    return engineResult('Candlestick AI', 0, 0, ['No candle data available for candlestick recognition'], { noCandles: true }, 1.0);
  }
  const a = candles[candles.length - 3];
  const b = ctx.previousCandle;
  const c = ctx.lastCandle;
  const d = candles[candles.length - 4];
  const avgBody = candles.slice(-20, -1).reduce((sum, candle) => sum + body(candle), 0) / Math.max(candles.slice(-20, -1).length, 1);
  const cBody = body(c);
  const cRange = range(c);
  const upper = upperWick(c);
  const lower = lowerWick(c);

  const doji = cBody / cRange < 0.12;
  const hammer = lower / cRange > 0.55 && upper / cRange < 0.22 && c.close >= (c.low + cRange * 0.55);
  const hangingMan = hammer && a && b && bullish(a) && bullish(b);
  const shootingStar = upper / cRange > 0.55 && lower / cRange < 0.22;
  const pinBar = lower / cRange > 0.62 || upper / cRange > 0.62;
  const marubozu = cBody / cRange > 0.82 && upper / cRange < 0.08 && lower / cRange < 0.08;
  const bullishEngulfing = b && bullish(c) && bearish(b) && c.close > b.open && c.open < b.close;
  const bearishEngulfing = b && bearish(c) && bullish(b) && c.open > b.close && c.close < b.open;
  const bullishHarami = b && bearish(b) && bullish(c) && c.open > b.close && c.close < b.open;
  const bearishHarami = b && bullish(b) && bearish(c) && c.open < b.close && c.close > b.open;
  const insideBar = b && c.high < b.high && c.low > b.low;
  const outsideBar = b && c.high > b.high && c.low < b.low;
  const morningStar = a && b && bearish(a) && body(b) / range(b) < 0.35 && bullish(c) && c.close > (a.open + a.close) / 2;
  const eveningStar = a && b && bullish(a) && body(b) / range(b) < 0.35 && bearish(c) && c.close < (a.open + a.close) / 2;
  const tweezerBottom = b && Math.abs(c.low - b.low) <= cRange * 0.08 && bearish(b) && bullish(c);
  const tweezerTop = b && Math.abs(c.high - b.high) <= cRange * 0.08 && bullish(b) && bearish(c);
  const threeWhiteSoldiers = a && b && bullish(a) && bullish(b) && bullish(c) && body(a) > avgBody * 0.8 && body(b) > avgBody * 0.8 && body(c) > avgBody * 0.8 && a.close < b.close && b.close < c.close;
  const threeBlackCrows = a && b && bearish(a) && bearish(b) && bearish(c) && body(a) > avgBody * 0.8 && body(b) > avgBody * 0.8 && body(c) > avgBody * 0.8 && a.close > b.close && b.close > c.close;

  let score = 0;
  if (hammer && !hangingMan) score += 22;
  if (hangingMan) score -= 14;
  if (shootingStar) score -= 22;
  if (bullishEngulfing || morningStar || tweezerBottom || threeWhiteSoldiers) score += 28;
  if (bearishEngulfing || eveningStar || tweezerTop || threeBlackCrows) score -= 28;
  if (bullishHarami) score += 14;
  if (bearishHarami) score -= 14;
  if (marubozu) score += bullish(c) ? 18 : -18;
  if (outsideBar) score += bullish(c) ? 10 : -10;
  if (doji || insideBar) score *= 0.45;
  if (d && morningStar && bearish(d)) score += 6;
  if (d && eveningStar && bullish(d)) score -= 6;

  return engineResult('Candlestick AI', score, 52 + Math.min(Math.abs(score), 34), [
    doji && 'Doji indecision candle',
    hammer && !hangingMan && 'Hammer bullish rejection',
    hangingMan && 'Hanging man warning after upside movement',
    shootingStar && 'Shooting star bearish rejection',
    pinBar && 'Pin bar wick rejection',
    bullishEngulfing && 'Bullish engulfing pattern',
    bearishEngulfing && 'Bearish engulfing pattern',
    morningStar && 'Morning star reversal sequence',
    eveningStar && 'Evening star reversal sequence',
    bullishHarami && 'Bullish harami compression',
    bearishHarami && 'Bearish harami compression',
    insideBar && 'Inside bar compression',
    outsideBar && 'Outside bar expansion',
    marubozu && `${bullish(c) ? 'Bullish' : 'Bearish'} marubozu candle`,
    tweezerBottom && 'Tweezer bottom support reaction',
    tweezerTop && 'Tweezer top resistance reaction',
    threeWhiteSoldiers && 'Three white soldiers continuation',
    threeBlackCrows && 'Three black crows continuation'
  ], {
    doji,
    hammer,
    engulfing: bullishEngulfing || bearishEngulfing,
    morningStar,
    eveningStar,
    harami: bullishHarami || bearishHarami,
    pinBar,
    insideBar,
    outsideBar,
    marubozu,
    shootingStar,
    hangingMan,
    tweezers: tweezerBottom || tweezerTop,
    threeWhiteSoldiers,
    threeBlackCrows
  }, 1.0);
}
