import { createAnalysisContext } from './context.js';
import { candlestickAI } from './engines/candlestickAI.js';
import { confidenceAI } from './engines/confidenceAI.js';
import { marketStructureAI } from './engines/marketStructureAI.js';
import { momentumAI } from './engines/momentumAI.js';
import { oscillatorAI } from './engines/oscillatorAI.js';
import { patternAI } from './engines/patternAI.js';
import { priceActionAI } from './engines/priceActionAI.js';
import { riskAI } from './engines/riskAI.js';
import { smartMoneyAI } from './engines/smartMoneyAI.js';
import { trendAI } from './engines/trendAI.js';
import { volumeAI } from './engines/volumeAI.js';
import { clamp, last, round } from '../utils/math.js';
import { listPredictions, savePrediction } from '../services/storageService.js';

const engines = [trendAI, momentumAI, oscillatorAI, candlestickAI, patternAI, priceActionAI, smartMoneyAI, volumeAI, marketStructureAI, riskAI];
const memoryCache = new Map();

function gradeSignal(confidence, riskLevel, noTrade) {
  if (noTrade) return 'C';
  if (confidence >= 86 && riskLevel !== 'High') return 'A+';
  if (confidence >= 76 && riskLevel !== 'High') return 'A';
  if (confidence >= 62) return 'B';
  return 'C';
}

function durationForecast(direction, confidence, ctx) {
  const atr = last(ctx.indicators.atr14, 0);
  const price = last(ctx.closes, 1);
  const volatilityDrag = clamp((atr / price) * 100 * 12, 0, 20);
  const base = direction === 'WAIT' || direction === 'NO TRADE' ? 44 : confidence;
  return {
    '15s': clamp(round(base - volatilityDrag * 0.3), 5, 95),
    '30s': clamp(round(base - volatilityDrag * 0.55 - 2), 5, 95),
    '1m': clamp(round(base - volatilityDrag * 0.75 - 4), 5, 95),
    '2m': clamp(round(base - volatilityDrag * 0.9 - 6), 5, 95),
    '3m': clamp(round(base - volatilityDrag - 7), 5, 95),
    '5m': clamp(round(base - volatilityDrag - 9), 5, 95),
    '10m': clamp(round(base - volatilityDrag * 1.15 - 12), 5, 95),
    '15m': clamp(round(base - volatilityDrag * 1.25 - 15), 5, 95)
  };
}

function recommendedExpiry(timeframe, confidence, riskLevel) {
  const conservative = riskLevel === 'High' || confidence < 68;
  const map = {
    '15s': conservative ? '30 seconds' : '15 seconds',
    '30s': conservative ? '1 minute' : '30 seconds',
    '1m': conservative ? '2 minutes' : '1 minute',
    '2m': conservative ? '5 minutes' : '2 minutes',
    '3m': conservative ? '5 minutes' : '3 minutes',
    '5m': conservative ? '5 minutes' : '10 minutes',
    '10m': conservative ? '10 minutes' : '15 minutes',
    '15m': '15 minutes'
  };
  return map[timeframe] || '1 minute';
}

function compactIndicators(ctx) {
  const latest = (key, fallback = null) => last(ctx.indicators[key], fallback);
  const macd = latest('macd', {});
  const adx = latest('adx14', {});
  const bollinger = latest('bollinger', {});
  const supertrend = latest('supertrend', {});
  const ichimoku = latest('ichimoku', {});
  const sar = latest('parabolicSar', {});
  return {
    rsi: round(latest('rsi14', 50), 2),
    macd: {
      line: round(macd.macd, 6),
      signal: round(macd.signal, 6),
      histogram: round(macd.histogram, 6)
    },
    ema9: round(latest('ema9'), 6),
    ema20: round(latest('ema20'), 6),
    ema50: round(latest('ema50'), 6),
    ema100: round(latest('ema100'), 6),
    ema200: round(latest('ema200'), 6),
    vwap: round(latest('vwap'), 6),
    adx: round(adx.adx, 2),
    atr: round(latest('atr14'), 6),
    supertrend,
    ichimoku,
    bollinger,
    stochasticRsi: round(latest('stochRsi', 50), 2),
    parabolicSar: sar,
    cci: round(latest('cci20', 0), 2),
    roc: round(latest('roc12', 0), 4),
    obv: round(latest('obv', 0), 2),
    cmf: round(latest('cmf20', 0), 4),
    mfi: round(latest('mfi14', 50), 2),
    pivotPoints: ctx.indicators.pivots,
    fibonacci: ctx.indicators.fibonacci
  };
}

function setupSignature(results, ctx) {
  return results.flatMap((result) => Object.entries(result.metrics || {})
    .filter(([, value]) => value === true)
    .map(([key]) => `${result.engine}:${key}`))
    .concat([
      last(ctx.indicators.supertrend, {}).direction === 'BUY' ? 'trend:supertrend-buy' : 'trend:supertrend-sell',
      last(ctx.indicators.parabolicSar, {}).direction === 'BUY' ? 'trend:sar-buy' : 'trend:sar-sell'
    ]);
}

async function patternMemory(symbol, timeframe, signature) {
  const cacheKey = `${symbol}:${timeframe}:${signature.slice().sort().join('|')}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 60_000) return cached.value;
  const history = await listPredictions(300).catch(() => []);
  const completed = history.filter((item) => item.winLoss || item.actualMarketResult || item.actual_market_result);
  if (!completed.length || !signature.length) {
    const value = {
      historicalSimilarity: 0,
      historicalWinRate: null,
      historicalLossRate: null,
      patternMatchConfidence: 0,
      samples: 0,
      status: 'Needs completed trade outcomes'
    };
    memoryCache.set(cacheKey, { at: Date.now(), value });
    return value;
  }
  const rows = completed.map((item) => {
    const setup = item.learningSnapshot?.setupSignature || item.payload?.learningSnapshot?.setupSignature || [];
    const overlap = setup.filter((key) => signature.includes(key)).length;
    const similarity = Math.round((overlap / Math.max(new Set([...setup, ...signature]).size, 1)) * 100);
    return { item, similarity };
  }).filter((row) => row.similarity >= 35 && (!symbol || row.item.symbol === symbol) && (!timeframe || row.item.timeframe === timeframe));
  const wins = rows.filter((row) => ['WIN', 'win', true].includes(row.item.winLoss || row.item.win_loss || row.item.payload?.winLoss));
  const value = {
    historicalSimilarity: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.similarity, 0) / rows.length) : 0,
    historicalWinRate: rows.length ? Math.round((wins.length / rows.length) * 100) : null,
    historicalLossRate: rows.length ? Math.round(((rows.length - wins.length) / rows.length) * 100) : null,
    patternMatchConfidence: rows.length ? clamp(Math.round(rows.length * 8 + rows.reduce((sum, row) => sum + row.similarity, 0) / rows.length * 0.55), 1, 95) : 0,
    samples: rows.length,
    status: rows.length ? 'Historical pattern memory matched completed outcomes' : 'No similar completed outcomes yet'
  };
  memoryCache.set(cacheKey, { at: Date.now(), value });
  return value;
}

function applyCalibration(confidence, memory) {
  if (!memory?.samples || memory.historicalWinRate === null) {
    return { confidence, adjustment: 0, reason: 'No completed similar trades yet, so confidence was not calibrated.' };
  }
  const adjustment = memory.historicalWinRate >= 68
    ? Math.min(8, (memory.historicalWinRate - 62) / 3)
    : memory.historicalWinRate <= 42
      ? -Math.min(12, (48 - memory.historicalWinRate) / 2)
      : 0;
  return {
    confidence: clamp(round(confidence + adjustment), 1, 99),
    adjustment: round(adjustment, 2),
    reason: adjustment > 0
      ? 'Similar completed setups have performed well, so confidence was increased gradually.'
      : adjustment < 0
        ? 'Similar completed setups have underperformed, so confidence was reduced.'
        : 'Similar completed setups are mixed, so confidence was left unchanged.'
  };
}

function tradePlanner(direction, ctx, riskLevel, confidence, timeframe) {
  const price = last(ctx.closes, 0);
  const atr = Math.max(last(ctx.indicators.atr14, price * 0.001), price * 0.0005);
  if (direction === 'WAIT' || direction === 'NO TRADE') {
    return {
      tradeType: 'Fixed Time Trade',
      action: direction,
      entry: round(price, 6),
      expiry: null,
      entryWindow: 'No entry window',
      stakeRiskPercent: 0,
      stopLoss: null,
      takeProfit: null,
      riskRewardRatio: null,
      invalidation: 'No trade until AI agreement, market quality, and volume confirmation improve.',
      payoutRule: 'Skip if broker payout is low or spread/latency is unstable.'
    };
  }
  const stakeRiskPercent = riskLevel === 'High' ? 0.5 : riskLevel === 'Medium' ? 1 : confidence >= 82 ? 1.5 : 1;
  const latestSupport = Math.min(...ctx.candles.slice(-28).map((candle) => candle.low));
  const latestResistance = Math.max(...ctx.candles.slice(-28).map((candle) => candle.high));
  const invalidation = direction === 'BUY'
    ? `Cancel the fixed-time setup if price closes below ${round(Math.min(latestSupport, price - atr * 0.7), 6)} or momentum flips negative.`
    : `Cancel the fixed-time setup if price closes above ${round(Math.max(latestResistance, price + atr * 0.7), 6)} or momentum flips positive.`;
  return {
    tradeType: 'Fixed Time Trade',
    action: direction,
    entry: round(price, 6),
    expiry: recommendedExpiry(timeframe, confidence, riskLevel),
    entryWindow: timeframe === '15s' || timeframe === '30s' ? 'Current candle or next candle only' : 'Next 1-2 candles',
    stakeRiskPercent,
    stopLoss: null,
    takeProfit: null,
    riskRewardRatio: null,
    invalidation,
    payoutRule: 'Prefer taking the signal only when broker payout is acceptable and execution latency is stable.',
    volatilityBuffer: round(atr, 6)
  };
}

export async function runFullAnalysis({ symbol, timeframe, candles, persist = true }) {
  if (!Array.isArray(candles) || candles.length < 5) {
    const analysis = {
      symbol,
      timeframe,
      generatedAt: new Date().toISOString(),
      direction: 'NO TRADE',
      tradeRecommendation: 'NO TRADE',
      finalOutput: 'NO TRADE',
      tradeScore: 0,
      tradeGrade: 'C',
      bullishProbability: 0,
      bearishProbability: 0,
      confidence: 0,
      riskLevel: 'High',
      signalGrade: 'C',
      highlight: false,
      trendStrength: 'Weak',
      noTradeReason: 'Not enough candle data available for stable analysis.',
      forecast: {},
      planner: {
        tradeType: 'Fixed Time Trade',
        action: 'NO TRADE',
        entry: null,
        expiry: null,
        entryWindow: 'No entry window',
        stakeRiskPercent: 0,
        invalidation: 'Wait for stable candle data.',
        payoutRule: 'Skip until market data is stable.'
      },
      entry: null,
      suggestedExpiry: null,
      reasons: ['Not enough candle data available for stable analysis.'],
      warnings: ['Market data returned too few candles.'],
      engines: [],
      tradeApproval: {
        question: 'Should this trade be taken?',
        answer: 'NO',
        approved: false,
        reason: 'Rejected because candle data is incomplete.'
      },
      patternMemory: {
        historicalSimilarity: 0,
        historicalWinRate: null,
        historicalLossRate: null,
        patternMatchConfidence: 0,
        samples: 0,
        status: 'Needs stable candle data'
      },
      confidenceCalibration: {
        confidence: 0,
        adjustment: 0,
        reason: 'Confidence cannot be calibrated without candle data.'
      },
      learningSnapshot: {
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toISOString().slice(11, 19),
        asset: symbol,
        expiry: timeframe,
        indicators: {},
        oscillators: {},
        patterns: [],
        trend: 'Unknown',
        volume: {},
        decision: 'NO TRADE',
        confidence: 0,
        probability: { bullish: 0, bearish: 0 },
        tradeQuality: 'C',
        actualMarketResult: null,
        winLoss: null,
        setupSignature: []
      },
      topFactors: [],
      lastPrice: null,
      dataSource: candles?.dataSource || 'unavailable',
      providerAudit: candles?.providerAudit || [],
      dataIntegrity: candles?.dataIntegrity || { status: 'unavailable', lowConfidence: true, confidencePenalty: 99, reason: 'No usable candles were available.' },
      lowConfidenceData: true,
      dataWarning: 'Market data returned too few candles. No trade should be taken.',
      candles: Array.isArray(candles) ? candles : []
    };
    if (persist) await savePrediction(analysis).catch(() => {});
    return analysis;
  }
  const ctx = createAnalysisContext({ symbol, timeframe, candles });
  const initialResults = engines.map((engine) => engine(ctx));
  const results = [...initialResults, confidenceAI(ctx, initialResults)];
  const weighted = results.reduce((acc, result) => {
    if (result.vote === 'BUY') acc.buy += result.confidence * result.weight;
    if (result.vote === 'SELL') acc.sell += result.confidence * result.weight;
    if (result.vote === 'WAIT') acc.wait += result.confidence * result.weight * 0.6;
    acc.total += result.confidence * result.weight;
    return acc;
  }, { buy: 0, sell: 0, wait: 0, total: 0 });
  const riskResult = results.find((result) => result.engine === 'Risk AI');
  const poorMarket = riskResult?.metrics?.poor || riskResult?.metrics?.volumeRatio < 0.55;
  const buyProbability = clamp(round((weighted.buy / Math.max(weighted.total, 1)) * 100 + 18), 1, 99);
  const sellProbability = clamp(round((weighted.sell / Math.max(weighted.total, 1)) * 100 + 18), 1, 99);
  const edge = Math.abs(buyProbability - sellProbability);
  let direction = buyProbability > sellProbability ? 'BUY' : 'SELL';
  let confidence = clamp(round(50 + edge * 0.7 + Math.max(weighted.buy, weighted.sell) / Math.max(weighted.total, 1) * 35), 1, 99);
  const dataIntegrity = candles.dataIntegrity || {
    status: 'unknown',
    lowConfidence: true,
    confidencePenalty: 12,
    reason: 'Market data could not be independently verified.'
  };
  const dataConfidencePenalty = dataIntegrity.lowConfidence ? Number(dataIntegrity.confidencePenalty || 12) : 0;
  confidence = clamp(round(confidence - dataConfidencePenalty), 1, 99);
  const signature = setupSignature(results, ctx);
  const memory = await patternMemory(symbol, timeframe, signature);
  const calibration = applyCalibration(confidence, memory);
  confidence = calibration.confidence;
  let riskLevel = riskResult?.riskLevel ?? 'Medium';
  if (dataIntegrity.status === 'provider-divergence') riskLevel = 'High';
  else if (dataIntegrity.lowConfidence && riskLevel === 'Low') riskLevel = 'Medium';
  const highRiskWithoutEdge = riskLevel === 'High' && confidence < 80;
  const lowConfidenceApproval = confidence < 58;
  const noTrade = poorMarket || edge < 10 || lowConfidenceApproval || highRiskWithoutEdge;
  if (noTrade) {
    direction = poorMarket || highRiskWithoutEdge ? 'NO TRADE' : 'WAIT';
    confidence = Math.min(confidence, 57);
  }
  const signalGrade = gradeSignal(confidence, riskLevel, noTrade);
  const tradeApproval = {
    question: 'Should this trade be taken?',
    answer: noTrade || direction === 'WAIT' || direction === 'NO TRADE' ? 'NO' : 'YES',
    approved: !(noTrade || direction === 'WAIT' || direction === 'NO TRADE'),
    reason: noTrade ? 'Rejected by no-trade engine.' : 'Approved because weighted AI agreement, risk, and market quality passed minimum thresholds.'
  };
  const topFactors = results.flatMap((result) => result.reasons.map((reason) => ({ reason, engine: result.engine, confidence: result.confidence })))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 7);
  const planner = tradePlanner(direction, ctx, riskLevel, confidence, timeframe);
  const warnings = [
    dataIntegrity.lowConfidence && dataIntegrity.reason,
    noTrade && 'No-trade engine blocked approval.',
    riskLevel === 'High' && 'High risk environment.',
    riskResult?.metrics?.volumeRatio < 0.75 && 'Weak volume confirmation.',
    memory.samples === 0 && 'No completed historical pattern memory for this setup yet.'
  ].filter(Boolean);
  const analysis = {
    symbol,
    timeframe,
    generatedAt: new Date().toISOString(),
    direction,
    tradeRecommendation: direction,
    finalOutput: direction,
    tradeScore: confidence,
    tradeGrade: signalGrade,
    bullishProbability: direction === 'NO TRADE' ? Math.min(buyProbability, 49) : buyProbability,
    bearishProbability: direction === 'NO TRADE' ? Math.min(sellProbability, 49) : sellProbability,
    confidence,
    riskLevel,
    signalGrade,
    highlight: !dataIntegrity.lowConfidence && (signalGrade === 'A' || signalGrade === 'A+'),
    trendStrength: riskResult?.metrics?.directionSlope && Math.abs(riskResult.metrics.directionSlope) > 0.25 ? 'Strong' : confidence > 70 ? 'Medium' : 'Weak',
    noTradeReason: noTrade ? [
      poorMarket && 'Sideways/low-quality market',
      riskResult?.metrics?.volumeRatio < 0.75 && 'Low volume confirmation',
      edge < 10 && 'Weak AI-engine confirmation',
      highRiskWithoutEdge && 'High-risk fixed-time setup without enough confidence edge',
      dataIntegrity.lowConfidence && dataIntegrity.reason,
      lowConfidenceApproval && 'Confidence below approval threshold'
    ].filter(Boolean).join(', ') : null,
    forecast: durationForecast(direction, confidence, ctx),
    planner,
    entry: planner.entry,
    suggestedExpiry: planner.expiry,
    reasons: topFactors.map((factor) => `${factor.engine}: ${factor.reason}`),
    warnings,
    engines: results,
    tradeApproval,
    patternMemory: memory,
    confidenceCalibration: calibration,
    learningSnapshot: {
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toISOString().slice(11, 19),
      asset: symbol,
      expiry: timeframe,
      indicators: compactIndicators(ctx),
      oscillators: {
        rsi: round(last(ctx.indicators.rsi14, 50), 2),
        stochasticRsi: round(last(ctx.indicators.stochRsi, 50), 2),
        cci: round(last(ctx.indicators.cci20, 0), 2),
        mfi: round(last(ctx.indicators.mfi14, 50), 2)
      },
      patterns: results.filter((result) => result.engine.includes('Pattern') || result.engine.includes('Candlestick')).flatMap((result) => result.reasons),
      trend: results.find((result) => result.engine === 'Trend AI')?.metrics?.trendStrength,
      volume: results.find((result) => result.engine === 'Volume AI')?.metrics,
      decision: direction,
      confidence,
      probability: { bullish: buyProbability, bearish: sellProbability },
      tradeQuality: signalGrade,
      actualMarketResult: null,
      winLoss: null,
      setupSignature: signature
    },
    topFactors,
    lastPrice: round(last(ctx.closes, 0), 6),
    dataSource: candles.dataSource || 'market data service',
    providerAudit: candles.providerAudit || [],
    dataIntegrity,
    lowConfidenceData: Boolean(dataIntegrity.lowConfidence),
    dataWarning: dataIntegrity.status === 'provider-divergence'
      ? dataIntegrity.reason
      : dataIntegrity.status === 'single-source'
        ? dataIntegrity.reason
        : candles.dataSource?.includes('OTC proxy') && candles.dataSource?.includes('continuity')
      ? 'OTC broker quotes are proprietary and free market data was unavailable, so this uses OTC-style continuity modelling. Treat it as analytical only and do not trade from continuity-mode output.'
      : candles.dataSource === 'continuity-model' || candles.dataSource?.includes('continuity')
        ? 'Free market data was unavailable, so this response uses continuity candles for interface resilience. Do not trade from continuity-mode output.'
        : candles.dataSource?.includes('OTC proxy')
        ? 'OTC broker quotes are proprietary. This instrument uses the best free proxy feed plus OTC-style modelling, so treat it as analytical only.'
        : candles.dataSource?.includes('Composite proxy')
          ? 'Composite instruments are calculated from underlying proxy components. Use them as market-strength analysis, not guaranteed broker pricing.'
          : null,
    candles: candles.slice(-220)
  };
  if (persist) await savePrediction(analysis).catch(() => {});
  return analysis;
}
