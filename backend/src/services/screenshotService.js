import { clamp, round } from '../utils/math.js';

export function analyzeScreenshot(stats = {}) {
  const green = Number(stats.greenDominance || 0);
  const red = Number(stats.redDominance || 0);
  const contrast = Number(stats.contrast || 0);
  const trendSlope = Number(stats.trendSlope || 0);
  const volatility = Number(stats.volatility || 0);
  const edge = green - red + trendSlope * 0.8;
  const direction = Math.abs(edge) < 8 || contrast < 4 ? 'WAIT' : edge > 0 ? 'BUY' : 'SELL';
  const confidence = direction === 'WAIT' ? 45 : clamp(round(55 + Math.abs(edge) * 0.9 + contrast * 0.35 - volatility * 0.15), 1, 92);
  return {
    direction,
    recommendation: direction,
    bullishProbability: clamp(round(50 + edge / 2), 1, 99),
    bearishProbability: clamp(round(50 - edge / 2), 1, 99),
    confidence,
    riskLevel: volatility > 55 ? 'High' : volatility > 28 ? 'Medium' : 'Low',
    trend: trendSlope > 8 ? 'Bullish' : trendSlope < -8 ? 'Bearish' : 'Sideways',
    patterns: [
      contrast > 25 && 'Strong candle contrast',
      volatility > 45 && 'Expanded volatility',
      Math.abs(edge) < 8 && 'Indecision / mixed candle pressure'
    ].filter(Boolean),
    supportResistance: {
      support: stats.supportBand ?? 'Lower visible range',
      resistance: stats.resistanceBand ?? 'Upper visible range'
    },
    reason: direction === 'WAIT'
      ? 'Screenshot quality or market structure does not show enough confirmation.'
      : 'Pixel trend, candle-color dominance, and visible volatility are aligned.'
  };
}
