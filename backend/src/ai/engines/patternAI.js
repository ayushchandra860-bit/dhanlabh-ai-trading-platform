import { engineResult } from '../helpers.js';
import { last, slope } from '../../utils/math.js';

function pivots(candles, key, radius = 3) {
  const rows = [];
  for (let i = radius; i < candles.length - radius; i += 1) {
    const window = candles.slice(i - radius, i + radius + 1).map((candle) => candle[key]);
    const value = candles[i][key];
    if (key === 'high' && value === Math.max(...window)) rows.push({ index: i, value });
    if (key === 'low' && value === Math.min(...window)) rows.push({ index: i, value });
  }
  return rows;
}

function closeEnough(a, b, tolerance) {
  const mid = (Math.abs(a) + Math.abs(b)) / 2 || 1;
  return Math.abs(a - b) / mid <= tolerance;
}

export function patternAI(ctx) {
  const recent = ctx.candles.slice(-90);
  const highs = pivots(recent, 'high');
  const lows = pivots(recent, 'low');
  const price = last(ctx.closes);
  const rangeHigh = Math.max(...recent.map((candle) => candle.high));
  const rangeLow = Math.min(...recent.map((candle) => candle.low));
  const range = Math.max(rangeHigh - rangeLow, price * 0.0001);
  const highA = highs.at(-1);
  const highB = highs.at(-2);
  const highC = highs.at(-3);
  const lowA = lows.at(-1);
  const lowB = lows.at(-2);
  const lowC = lows.at(-3);
  const tolerance = 0.004;

  const doubleTop = highA && highB && closeEnough(highA.value, highB.value, tolerance) && price < highA.value - range * 0.08;
  const doubleBottom = lowA && lowB && closeEnough(lowA.value, lowB.value, tolerance) && price > lowA.value + range * 0.08;
  const tripleTop = doubleTop && highC && closeEnough(highA.value, highC.value, tolerance * 1.3);
  const tripleBottom = doubleBottom && lowC && closeEnough(lowA.value, lowC.value, tolerance * 1.3);
  const headShoulders = highA && highB && highC && highB.value > highA.value && highB.value > highC.value && closeEnough(highA.value, highC.value, tolerance * 2) && price < Math.min(lowA?.value ?? price, lowB?.value ?? price);
  const inverseHeadShoulders = lowA && lowB && lowC && lowB.value < lowA.value && lowB.value < lowC.value && closeEnough(lowA.value, lowC.value, tolerance * 2) && price > Math.max(highA?.value ?? price, highB?.value ?? price);
  const highSlope = highs.length > 2 ? slope(highs.slice(-5).map((item) => item.value)) : 0;
  const lowSlope = lows.length > 2 ? slope(lows.slice(-5).map((item) => item.value)) : 0;
  const ascendingTriangle = Math.abs(highSlope) < 0.05 && lowSlope > 0.05 && price > rangeHigh - range * 0.15;
  const descendingTriangle = Math.abs(lowSlope) < 0.05 && highSlope < -0.05 && price < rangeLow + range * 0.15;
  const symmetricalTriangle = highSlope < -0.04 && lowSlope > 0.04;
  const channelUp = highSlope > 0.04 && lowSlope > 0.04;
  const channelDown = highSlope < -0.04 && lowSlope < -0.04;
  const risingWedge = highSlope > 0.02 && lowSlope > highSlope * 1.35;
  const fallingWedge = lowSlope < -0.02 && highSlope < lowSlope * 1.35;
  const rectangle = (range / price) < 0.018 && Math.abs(highSlope) < 0.04 && Math.abs(lowSlope) < 0.04;
  const impulse = Math.abs(slope(ctx.closes.slice(-28, -12)));
  const consolidation = Math.abs(slope(ctx.closes.slice(-12))) < 0.04;
  const flag = impulse > 0.25 && consolidation;
  const pennant = flag && symmetricalTriangle;
  const cupHandle = lowC && lowB && lowA && lowB.value < lowC.value && lowB.value < lowA.value && closeEnough(lowC.value, lowA.value, tolerance * 4) && consolidation;
  const diamond = highs.length >= 4 && lows.length >= 4 && Math.abs(highSlope) < 0.16 && Math.abs(lowSlope) < 0.16 && range / price > 0.012;

  let score = 0;
  if (doubleBottom || tripleBottom || inverseHeadShoulders || ascendingTriangle || fallingWedge || cupHandle) score += 24;
  if (doubleTop || tripleTop || headShoulders || descendingTriangle || risingWedge) score -= 24;
  if (symmetricalTriangle || rectangle || diamond) score *= 0.5;
  if (channelUp) score += 10;
  if (channelDown) score -= 10;
  if (flag || pennant) score += slope(ctx.closes.slice(-28, -12)) > 0 ? 12 : -12;

  return engineResult('Chart Pattern AI', score, 50 + Math.min(Math.abs(score), 34), [
    headShoulders && 'Head and shoulders distribution pattern',
    inverseHeadShoulders && 'Inverse head and shoulders reversal pattern',
    doubleTop && 'Double top resistance pattern',
    doubleBottom && 'Double bottom support pattern',
    tripleTop && 'Triple top resistance pattern',
    tripleBottom && 'Triple bottom support pattern',
    ascendingTriangle && 'Ascending triangle pressure',
    descendingTriangle && 'Descending triangle pressure',
    symmetricalTriangle && 'Symmetrical triangle compression',
    flag && 'Flag continuation structure',
    pennant && 'Pennant continuation structure',
    channelUp && 'Rising channel structure',
    channelDown && 'Falling channel structure',
    risingWedge && 'Rising wedge risk',
    fallingWedge && 'Falling wedge recovery setup',
    cupHandle && 'Cup and handle accumulation pattern',
    rectangle && 'Rectangle range-bound structure',
    diamond && 'Diamond volatility structure'
  ], {
    headShoulders,
    inverseHeadShoulders,
    doubleTop,
    doubleBottom,
    tripleTop,
    tripleBottom,
    ascendingTriangle,
    descendingTriangle,
    symmetricalTriangle,
    flags: flag,
    pennants: pennant,
    channels: channelUp || channelDown,
    wedges: risingWedge || fallingWedge,
    cupHandle,
    rectangle,
    diamond
  }, 0.9);
}
