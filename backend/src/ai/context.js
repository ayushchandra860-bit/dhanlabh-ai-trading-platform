import {
  adx,
  atr,
  bollinger,
  cci,
  cmf,
  ema,
  fibonacciLevels,
  ichimoku,
  macd,
  mfi,
  obv,
  parabolicSar,
  pivotPoints,
  roc,
  rsi,
  sma,
  stochasticRsi,
  supertrend,
  vwap
} from '../utils/indicators.js';
import { last } from '../utils/math.js';

export function createAnalysisContext({ symbol, timeframe, candles }) {
  const closes = candles.map((candle) => candle.close);
  const highs = candles.map((candle) => candle.high);
  const lows = candles.map((candle) => candle.low);
  const volumes = candles.map((candle) => candle.volume);
  const indicators = {
    sma20: sma(closes, 20),
    ema9: ema(closes, 9),
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    ema100: ema(closes, 100),
    ema200: ema(closes, 200),
    rsi14: rsi(closes, 14),
    macd: macd(closes),
    atr14: atr(candles, 14),
    adx14: adx(candles, 14),
    stochRsi: stochasticRsi(closes, 14),
    bollinger: bollinger(closes, 20, 2),
    vwap: vwap(candles),
    supertrend: supertrend(candles, 10, 3),
    ichimoku: ichimoku(candles),
    parabolicSar: parabolicSar(candles),
    cci20: cci(candles, 20),
    roc12: roc(closes, 12),
    obv: obv(candles),
    cmf20: cmf(candles, 20),
    mfi14: mfi(candles, 14),
    fibonacci: fibonacciLevels(candles),
    pivots: pivotPoints(candles)
  };
  return {
    symbol,
    timeframe,
    candles,
    closes,
    highs,
    lows,
    volumes,
    lastCandle: last(candles),
    previousCandle: candles[candles.length - 2],
    indicators
  };
}
