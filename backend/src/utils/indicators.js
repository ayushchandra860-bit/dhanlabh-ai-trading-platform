import { average, standardDeviation } from './math.js';

export function sma(values, period) {
  return values.map((_, index) => index + 1 < period ? null : average(values.slice(index + 1 - period, index + 1)));
}

export function ema(values, period) {
  const k = 2 / (period + 1);
  let previous = values[0] ?? 0;
  return values.map((value, index) => {
    previous = index === 0 ? value : value * k + previous * (1 - k);
    return previous;
  });
}

function highest(candles, key, period, index) {
  const start = Math.max(0, index + 1 - period);
  return Math.max(...candles.slice(start, index + 1).map((candle) => candle[key]));
}

function lowest(candles, key, period, index) {
  const start = Math.max(0, index + 1 - period);
  return Math.min(...candles.slice(start, index + 1).map((candle) => candle[key]));
}

export function rsi(values, period = 14) {
  const result = Array(values.length).fill(null);
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < values.length; i += 1) {
    const change = values[i] - values[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    if (i <= period) {
      gains += gain;
      losses += loss;
      if (i === period) {
        const rs = losses === 0 ? 100 : gains / losses;
        result[i] = 100 - 100 / (1 + rs);
      }
    } else {
      gains = (gains * (period - 1) + gain) / period;
      losses = (losses * (period - 1) + loss) / period;
      const rs = losses === 0 ? 100 : gains / losses;
      result[i] = 100 - 100 / (1 + rs);
    }
  }
  return result;
}

export function macd(values, fast = 12, slow = 26, signal = 9) {
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const line = values.map((_, index) => fastEma[index] - slowEma[index]);
  const signalLine = ema(line, signal);
  return line.map((value, index) => ({
    macd: value,
    signal: signalLine[index],
    histogram: value - signalLine[index]
  }));
}

export function atr(candles, period = 14) {
  const ranges = candles.map((candle, index) => {
    if (index === 0) return candle.high - candle.low;
    const prevClose = candles[index - 1].close;
    return Math.max(candle.high - candle.low, Math.abs(candle.high - prevClose), Math.abs(candle.low - prevClose));
  });
  return ema(ranges, period);
}

export function supertrend(candles, period = 10, multiplier = 3) {
  const atrLine = atr(candles, period);
  const bands = candles.map((candle, index) => {
    const hl2 = (candle.high + candle.low) / 2;
    const range = atrLine[index] || candle.high - candle.low;
    return {
      upperBasic: hl2 + multiplier * range,
      lowerBasic: hl2 - multiplier * range
    };
  });
  const result = [];
  for (let i = 0; i < candles.length; i += 1) {
    if (i === 0) {
      result.push({ value: bands[i].lowerBasic, direction: 'BUY', upper: bands[i].upperBasic, lower: bands[i].lowerBasic });
      continue;
    }
    const prev = result[i - 1];
    const prevClose = candles[i - 1].close;
    const upper = bands[i].upperBasic < prev.upper || prevClose > prev.upper ? bands[i].upperBasic : prev.upper;
    const lower = bands[i].lowerBasic > prev.lower || prevClose < prev.lower ? bands[i].lowerBasic : prev.lower;
    const direction = prev.direction === 'SELL'
      ? candles[i].close > upper ? 'BUY' : 'SELL'
      : candles[i].close < lower ? 'SELL' : 'BUY';
    result.push({ value: direction === 'BUY' ? lower : upper, direction, upper, lower });
  }
  return result;
}

export function ichimoku(candles) {
  return candles.map((_, index) => {
    const tenkan = (highest(candles, 'high', 9, index) + lowest(candles, 'low', 9, index)) / 2;
    const kijun = (highest(candles, 'high', 26, index) + lowest(candles, 'low', 26, index)) / 2;
    const spanA = (tenkan + kijun) / 2;
    const spanB = (highest(candles, 'high', 52, index) + lowest(candles, 'low', 52, index)) / 2;
    const chikou = candles[index - 26]?.close ?? null;
    return { tenkan, kijun, spanA, spanB, chikou };
  });
}

export function parabolicSar(candles, step = 0.02, maxStep = 0.2) {
  if (!candles.length) return [];
  let rising = true;
  let acceleration = step;
  let extreme = candles[0].high;
  let sar = candles[0].low;
  return candles.map((candle, index) => {
    if (index === 0) return { value: sar, direction: 'BUY' };
    sar += acceleration * (extreme - sar);
    if (rising) {
      sar = Math.min(sar, candles[index - 1].low, candles[index - 2]?.low ?? candles[index - 1].low);
      if (candle.low < sar) {
        rising = false;
        sar = extreme;
        extreme = candle.low;
        acceleration = step;
      } else if (candle.high > extreme) {
        extreme = candle.high;
        acceleration = Math.min(maxStep, acceleration + step);
      }
    } else {
      sar = Math.max(sar, candles[index - 1].high, candles[index - 2]?.high ?? candles[index - 1].high);
      if (candle.high > sar) {
        rising = true;
        sar = extreme;
        extreme = candle.high;
        acceleration = step;
      } else if (candle.low < extreme) {
        extreme = candle.low;
        acceleration = Math.min(maxStep, acceleration + step);
      }
    }
    return { value: sar, direction: rising ? 'BUY' : 'SELL' };
  });
}

export function adx(candles, period = 14) {
  const plusDm = [0];
  const minusDm = [0];
  const trueRanges = [candles[0] ? candles[0].high - candles[0].low : 0];
  for (let i = 1; i < candles.length; i += 1) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDm.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDm.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trueRanges.push(Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i - 1].close), Math.abs(candles[i].low - candles[i - 1].close)));
  }
  const atrLine = ema(trueRanges, period);
  const plusDi = ema(plusDm, period).map((value, index) => atrLine[index] ? (100 * value) / atrLine[index] : 0);
  const minusDi = ema(minusDm, period).map((value, index) => atrLine[index] ? (100 * value) / atrLine[index] : 0);
  const dx = plusDi.map((value, index) => {
    const total = value + minusDi[index];
    return total ? (100 * Math.abs(value - minusDi[index])) / total : 0;
  });
  return ema(dx, period).map((value, index) => ({ adx: value, plusDi: plusDi[index], minusDi: minusDi[index] }));
}

export function stochasticRsi(values, period = 14) {
  const rsiLine = rsi(values, period);
  return rsiLine.map((value, index) => {
    if (value === null || index + 1 < period) return null;
    const window = rsiLine.slice(Math.max(0, index + 1 - period), index + 1).filter((item) => item !== null);
    const low = Math.min(...window);
    const high = Math.max(...window);
    return high === low ? 50 : ((value - low) / (high - low)) * 100;
  });
}

export function cci(candles, period = 20) {
  const typical = candles.map((candle) => (candle.high + candle.low + candle.close) / 3);
  return typical.map((value, index) => {
    if (index + 1 < period) return null;
    const window = typical.slice(index + 1 - period, index + 1);
    const mean = average(window);
    const meanDeviation = average(window.map((item) => Math.abs(item - mean)));
    return meanDeviation ? (value - mean) / (0.015 * meanDeviation) : 0;
  });
}

export function roc(values, period = 12) {
  return values.map((value, index) => {
    if (index < period) return null;
    const previous = values[index - period];
    return previous ? ((value - previous) / previous) * 100 : 0;
  });
}

export function obv(candles) {
  let total = 0;
  return candles.map((candle, index) => {
    if (index > 0) {
      if (candle.close > candles[index - 1].close) total += candle.volume || 0;
      if (candle.close < candles[index - 1].close) total -= candle.volume || 0;
    }
    return total;
  });
}

export function cmf(candles, period = 20) {
  const moneyFlow = candles.map((candle) => {
    const range = candle.high - candle.low;
    const multiplier = range ? ((candle.close - candle.low) - (candle.high - candle.close)) / range : 0;
    return { mfv: multiplier * (candle.volume || 0), volume: candle.volume || 0 };
  });
  return moneyFlow.map((_, index) => {
    if (index + 1 < period) return null;
    const window = moneyFlow.slice(index + 1 - period, index + 1);
    const volume = window.reduce((sum, item) => sum + item.volume, 0);
    return volume ? window.reduce((sum, item) => sum + item.mfv, 0) / volume : 0;
  });
}

export function mfi(candles, period = 14) {
  const typical = candles.map((candle) => (candle.high + candle.low + candle.close) / 3);
  const result = Array(candles.length).fill(null);
  for (let index = period; index < candles.length; index += 1) {
    let positive = 0;
    let negative = 0;
    for (let i = index + 1 - period; i <= index; i += 1) {
      const flow = typical[i] * (candles[i].volume || 0);
      if (typical[i] > typical[i - 1]) positive += flow;
      else if (typical[i] < typical[i - 1]) negative += flow;
    }
    const ratio = negative === 0 ? 100 : positive / negative;
    result[index] = 100 - 100 / (1 + ratio);
  }
  return result;
}

export function bollinger(values, period = 20, multiplier = 2) {
  return values.map((_, index) => {
    if (index + 1 < period) return null;
    const window = values.slice(index + 1 - period, index + 1);
    const mid = average(window);
    const dev = standardDeviation(window);
    return { lower: mid - dev * multiplier, middle: mid, upper: mid + dev * multiplier };
  });
}

export function vwap(candles) {
  let cumulativeTypicalVolume = 0;
  let cumulativeVolume = 0;
  return candles.map((candle) => {
    const typical = (candle.high + candle.low + candle.close) / 3;
    cumulativeTypicalVolume += typical * candle.volume;
    cumulativeVolume += candle.volume;
    return cumulativeVolume ? cumulativeTypicalVolume / cumulativeVolume : candle.close;
  });
}

export function fibonacciLevels(candles, lookback = 80) {
  const window = candles.slice(-lookback);
  const high = Math.max(...window.map((candle) => candle.high));
  const low = Math.min(...window.map((candle) => candle.low));
  const range = high - low;
  return {
    high,
    low,
    levels: {
      '23.6': high - range * 0.236,
      '38.2': high - range * 0.382,
      '50.0': high - range * 0.5,
      '61.8': high - range * 0.618,
      '78.6': high - range * 0.786
    }
  };
}

export function pivotPoints(candles) {
  const candle = candles[candles.length - 2] ?? candles[candles.length - 1];
  if (!candle) return null;
  const pivot = (candle.high + candle.low + candle.close) / 3;
  return {
    pivot,
    r1: 2 * pivot - candle.low,
    s1: 2 * pivot - candle.high,
    r2: pivot + (candle.high - candle.low),
    s2: pivot - (candle.high - candle.low)
  };
}
