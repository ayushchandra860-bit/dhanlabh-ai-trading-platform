import { average, clamp, last, round, slope, standardDeviation } from '../utils/math.js';

export function voteFromScore(score, threshold = 12) {
  if (score > threshold) return 'BUY';
  if (score < -threshold) return 'SELL';
  return 'WAIT';
}

export function engineResult(engine, score, confidence, reasons, metrics = {}, weight = 1) {
  const bullishProbability = clamp(round(50 + score / 2, 1), 1, 99);
  const bearishProbability = clamp(round(50 - score / 2, 1), 1, 99);
  const vote = voteFromScore(score);
  const quality = confidence >= 72 && vote !== 'WAIT' ? 'Good' : confidence < 54 || vote === 'WAIT' ? 'Bad' : 'Moderate';
  return {
    engine,
    vote,
    score: round(score, 2),
    confidence: clamp(round(confidence, 1), 0, 99),
    bullishProbability,
    bearishProbability,
    positiveProbability: bullishProbability,
    negativeProbability: bearishProbability,
    polarity: score > 8 ? 'Positive' : score < -8 ? 'Negative' : 'Neutral',
    quality,
    reasons: reasons.filter(Boolean).slice(0, 4),
    metrics,
    weight
  };
}

export function marketQuality(ctx) {
  const recent = ctx.candles.slice(-40);
  const closes = recent.map((candle) => candle.close);
  const atr = last(ctx.indicators.atr14, 0);
  const price = last(ctx.closes, 1);
  const volatility = price ? (atr / price) * 100 : 0;
  const range = Math.max(...closes) - Math.min(...closes);
  const rangePercent = price ? (range / price) * 100 : 0;
  const volumeAvg = average(ctx.volumes.slice(-40));
  const volumeNow = last(ctx.volumes, 0);
  const directionSlope = slope(ctx.closes.slice(-30));
  const chop = standardDeviation(closes) / (Math.abs(directionSlope) + 0.01);
  return {
    volatility,
    rangePercent,
    volumeRatio: volumeAvg ? volumeNow / volumeAvg : 1,
    directionSlope,
    chop,
    poor: rangePercent < 0.08 || (Math.abs(directionSlope) < 0.03 && chop > 1.8)
  };
}

export function levels(ctx, lookback = 80) {
  const recent = ctx.candles.slice(-lookback);
  return {
    support: Math.min(...recent.map((candle) => candle.low)),
    resistance: Math.max(...recent.map((candle) => candle.high))
  };
}
