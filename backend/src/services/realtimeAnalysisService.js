import { ASSETS } from '../config/assets.js';
import { runFullAnalysis } from '../ai/ensemble.js';
import { getCandles } from './marketDataService.js';

const analysisCache = new Map();
const inFlight = new Map();
const ttlMs = 900;

function key(symbol, timeframe) {
  return `${symbol}:${timeframe}`;
}

function candleSignature(candles) {
  const last = candles.at(-1);
  if (!last) return 'empty';
  return [
    candles.length,
    Math.round(last.time || 0),
    Number(last.open || 0).toFixed(6),
    Number(last.high || 0).toFixed(6),
    Number(last.low || 0).toFixed(6),
    Number(last.close || 0).toFixed(6),
    Math.round(last.volume || 0)
  ].join(':');
}

function enrich(analysis, cached, startedAt, signature) {
  const previousPrice = cached?.analysis?.lastPrice;
  const tickDirection = previousPrice
    ? analysis.lastPrice > previousPrice ? 'up' : analysis.lastPrice < previousPrice ? 'down' : 'flat'
    : 'flat';
  const previousConfidence = cached?.analysis?.confidence;
  return {
    ...analysis,
    marketVersion: (cached?.marketVersion || 0) + (cached?.signature === signature ? 0 : 1),
    streamMode: 'incremental',
    tickDirection,
    priceChange: previousPrice ? Number((analysis.lastPrice - previousPrice).toFixed(6)) : 0,
    confidenceChange: Number((analysis.confidence - (previousConfidence ?? analysis.confidence)).toFixed(2)),
    analysisLatencyMs: Date.now() - startedAt,
    optimization: {
      shortTtlMs: ttlMs,
      coalesced: false,
      indicatorMode: 'rolling-cache',
      refreshedAt: new Date().toISOString()
    }
  };
}

export async function analyzeRealtime({ symbol = 'BTC/USD', timeframe = '1m', limit = 320, force = false, persist = false }) {
  const cacheKey = key(symbol, timeframe);
  const cached = analysisCache.get(cacheKey);
  const now = Date.now();
  if (!force && cached && now - cached.at < ttlMs) {
    return {
      ...cached.analysis,
      optimization: {
        ...(cached.analysis.optimization || {}),
        coalesced: true,
        cacheAgeMs: now - cached.at
      }
    };
  }
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  const task = (async () => {
    const startedAt = Date.now();
    const candles = await getCandles(symbol, timeframe, limit);
    const signature = candleSignature(candles);
    const analysis = await runFullAnalysis({ symbol, timeframe, candles, persist });
    const enriched = enrich(analysis, cached, startedAt, signature);
    analysisCache.set(cacheKey, { at: Date.now(), signature, marketVersion: enriched.marketVersion, analysis: enriched });
    return enriched;
  })().finally(() => inFlight.delete(cacheKey));

  inFlight.set(cacheKey, task);
  return task;
}

export async function analyzeWatchlist({ symbols, timeframe = '1m', limit = 220 }) {
  const list = (symbols?.length ? symbols : ASSETS.slice(0, 18).map((asset) => asset.symbol)).slice(0, 60);
  const batchSize = 10;
  const results = [];
  for (let i = 0; i < list.length; i += batchSize) {
    const batch = list.slice(i, i + batchSize);
    results.push(...await Promise.all(batch.map((symbol) => analyzeRealtime({ symbol, timeframe, limit, persist: false }))));
  }
  return results.sort((a, b) => {
    const aRank = (a.highlight ? 1000 : 0) + a.confidence;
    const bRank = (b.highlight ? 1000 : 0) + b.confidence;
    return bRank - aRank;
  });
}

export async function analyzeMultiTimeframe({ symbol = 'BTC/USD', timeframes = ['15s', '30s', '1m', '5m', '15m'] }) {
  const rows = await Promise.all(timeframes.map((timeframe) => analyzeRealtime({ symbol, timeframe, limit: 260, persist: false })));
  const buyVotes = rows.filter((row) => row.direction === 'BUY').length;
  const sellVotes = rows.filter((row) => row.direction === 'SELL').length;
  const waitVotes = rows.length - buyVotes - sellVotes;
  const alignment = Math.round((Math.max(buyVotes, sellVotes, waitVotes) / rows.length) * 100);
  return {
    symbol,
    alignment,
    dominantDirection: buyVotes > sellVotes && buyVotes > waitVotes ? 'BUY' : sellVotes > buyVotes && sellVotes > waitVotes ? 'SELL' : 'WAIT',
    rows: rows.map((row) => ({
      timeframe: row.timeframe,
      direction: row.direction,
      confidence: row.confidence,
      bullishProbability: row.bullishProbability,
      bearishProbability: row.bearishProbability,
      riskLevel: row.riskLevel,
      signalGrade: row.signalGrade,
      lastPrice: row.lastPrice,
      tickDirection: row.tickDirection
    }))
  };
}

export function realtimeEngineStats() {
  return {
    cacheEntries: analysisCache.size,
    activeJobs: inFlight.size,
    ttlMs,
    mode: 'incremental rolling-cache analysis',
    updatedAt: new Date().toISOString()
  };
}
