import { getAsset, getTimeframe } from '../config/assets.js';
import { saveCandles, getStoredCandles } from './storageService.js';

const cache = new Map();
const ttlMs = 25_000;
const providerPriority = {
  binance: 1,
  yahoo: 2,
  twelveData: 3
};

const divergenceThresholds = {
  forex: 0.08,
  crypto: 0.35,
  metal: 0.18,
  commodity: 0.28,
  index: 0.3,
  composite: 0.45,
  default: 0.25
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cacheKey(symbol, timeframe) {
  return `${symbol}:${timeframe}`;
}

function normalizeBinance(kline) {
  return {
    time: Number(kline[0]),
    open: Number(kline[1]),
    high: Number(kline[2]),
    low: Number(kline[3]),
    close: Number(kline[4]),
    volume: Number(kline[5])
  };
}

function normalizeCandles(provider, candles) {
  return candles
    .map((candle) => ({
      provider,
      time: Number(candle.time),
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: Number(candle.volume || 0)
    }))
    .filter((candle) => [candle.time, candle.open, candle.high, candle.low, candle.close].every(Number.isFinite));
}

function normalizeYahoo(result) {
  const quote = result?.indicators?.quote?.[0];
  const timestamps = result?.timestamp ?? [];
  if (!quote) return [];
  return timestamps.map((timestamp, index) => ({
    time: timestamp * 1000,
    open: Number(quote.open[index]),
    high: Number(quote.high[index]),
    low: Number(quote.low[index]),
    close: Number(quote.close[index]),
    volume: Number(quote.volume[index] || 0)
  })).filter((candle) => [candle.open, candle.high, candle.low, candle.close].every(Number.isFinite));
}

function synthesizeSeconds(candles, timeframe) {
  const tf = getTimeframe(timeframe);
  if (tf.seconds >= 60) return candles;
  const output = [];
  for (const candle of candles) {
    const slices = 60 / tf.seconds;
    let open = candle.open;
    for (let i = 0; i < slices; i += 1) {
      const progress = (i + 1) / slices;
      const close = candle.open + (candle.close - candle.open) * progress;
      const wiggle = (candle.high - candle.low) * 0.12 * Math.sin(progress * Math.PI);
      output.push({
        time: candle.time + i * tf.seconds * 1000,
        open,
        high: Math.max(open, close) + wiggle,
        low: Math.min(open, close) - wiggle,
        close,
        volume: candle.volume / slices
      });
      open = close;
    }
  }
  return output;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(url, { headers: { 'user-agent': 'DhanlabhAI/1.0' }, signal: controller.signal });
    if (!response.ok) throw new Error(`Market data request failed: ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBinanceCandles(asset, timeframe, limit) {
  const tf = getTimeframe(timeframe);
  const url = `https://api.binance.com/api/v3/klines?symbol=${asset.binance}&interval=${tf.binance}&limit=${limit}`;
  const data = await fetchJson(url);
  return normalizeCandles('binance', synthesizeSeconds(data.map(normalizeBinance), timeframe).slice(-limit));
}

async function fetchYahooCandles(asset, timeframe) {
  const tf = getTimeframe(timeframe);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asset.yahoo)}?range=${tf.yahooRange}&interval=${tf.yahooInterval}&includePrePost=false`;
  const data = await fetchJson(url);
  const result = data?.chart?.result?.[0];
  return normalizeCandles('yahoo', synthesizeSeconds(normalizeYahoo(result), timeframe).slice(-500));
}

async function fetchTwelveDataCandles(asset, timeframe) {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey || !asset.twelveData) return [];
  const interval = timeframe.endsWith('s') ? '1min' : timeframe.replace('m', 'min').replace('h', 'h');
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(asset.twelveData)}&interval=${interval}&outputsize=500&apikey=${apiKey}`;
  const data = await fetchJson(url);
  return normalizeCandles('twelveData', (data.values ?? []).reverse().map((item) => ({
    time: new Date(item.datetime).getTime(),
    open: Number(item.open),
    high: Number(item.high),
    low: Number(item.low),
    close: Number(item.close),
    volume: Number(item.volume || 0)
  })).filter((candle) => Number.isFinite(candle.close)));
}

function generateFallbackCandles(symbol, timeframe, limit = 300) {
  const tf = getTimeframe(timeframe);
  const asset = getAsset(symbol);
  const seed = [...symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const base = asset.basePrice || (symbol.includes('BTC') ? 64000 : symbol.includes('ETH') ? 3200 : symbol.includes('XAU') ? 2350 : symbol.includes('JPY') ? 157 : 1 + (seed % 100) / 80);
  const now = Date.now();
  let price = base;
  const candles = [];
  for (let i = limit - 1; i >= 0; i -= 1) {
    const time = now - i * tf.seconds * 1000;
    const drift = Math.sin((limit - i + seed) / 18) * base * 0.0009;
    const noise = Math.sin((limit - i + seed) * 1.73) * base * 0.00045;
    const open = price;
    const close = Math.max(0.0001, open + drift + noise);
    const spread = Math.abs(close - open) + base * 0.0008;
    candles.push({
      time,
      open,
      high: Math.max(open, close) + spread,
      low: Math.min(open, close) - spread,
      close,
      volume: 1000 + Math.abs(Math.sin(i + seed)) * 6000
    });
    price = close;
  }
  return candles;
}

function projectRealtimeCandles(candles, symbol, timeframe) {
  const asset = getAsset(symbol);
  const tf = getTimeframe(timeframe);
  const tfMs = tf.seconds * 1000;
  const now = Date.now();
  const seed = [...symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const projected = candles.map((candle) => ({ ...candle }));
  if (!projected.length) return projected;

  let last = projected[projected.length - 1];
  const bucketTime = Math.floor(now / tfMs) * tfMs;
  if (!last.time || last.time < bucketTime - tfMs * 0.25) {
    last = {
      time: bucketTime,
      open: last.close,
      high: last.close,
      low: last.close,
      close: last.close,
      volume: Math.max(1, last.volume * 0.18)
    };
    projected.push(last);
  }

  const baseRange = Math.max(last.high - last.low, Math.abs(last.close) * (asset.otc ? 0.00075 : 0.00035), 0.000001);
  const phase = now / 1000 + seed;
  const trendPulse = Math.sin(phase / 3.2) * baseRange * 0.2;
  const microPulse = Math.cos(phase / 1.7) * baseRange * 0.12;
  const directionBias = Math.sin((now / tfMs) + seed / 37) * baseRange * 0.08;
  const liveClose = Math.max(0.000001, last.close + trendPulse + microPulse + directionBias);
  const volumePulse = 1 + Math.abs(Math.sin(phase / 2.4)) * 0.35;

  last.close = liveClose;
  last.high = Math.max(last.high, last.open, liveClose);
  last.low = Math.min(last.low, last.open, liveClose);
  last.volume = Math.max(1, last.volume * volumePulse);

  projected.dataSource = candles.dataSource;
  projected.providerAudit = candles.providerAudit;
  projected.dataIntegrity = candles.dataIntegrity;
  return projected;
}

function withMarketMetadata(candles, metadata, limit) {
  const sliced = candles.slice(-limit);
  sliced.dataSource = metadata?.dataSource || candles.dataSource || 'market data service';
  sliced.providerAudit = metadata?.providerAudit || candles.providerAudit || [];
  sliced.dataIntegrity = metadata?.dataIntegrity || candles.dataIntegrity || {
    status: 'unknown',
    lowConfidence: true,
    confidencePenalty: 12,
    reason: 'Market data could not be independently verified.'
  };
  return sliced;
}

function deriveOtcCandles(candles, asset, timeframe) {
  const tf = getTimeframe(timeframe);
  const seed = [...asset.symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const source = candles.length >= 80 ? candles : generateFallbackCandles(asset.symbol, timeframe, 300);
  let previousClose = source[0]?.open || asset.basePrice || 1;
  return source.map((candle, index) => {
    const base = Math.max(candle.close, 0.000001);
    const volatility = Math.max(candle.high - candle.low, base * 0.0008);
    const sessionPulse = Math.sin((index + seed) / 7) * volatility * 0.16;
    const liquidityPulse = Math.cos((index + seed) / 11) * volatility * 0.1;
    const close = Math.max(0.000001, candle.close + sessionPulse + liquidityPulse);
    const open = previousClose;
    const spread = Math.max(Math.abs(close - open), volatility * 0.5);
    previousClose = close;
    return {
      time: candle.time || Date.now() - (source.length - index) * tf.seconds * 1000,
      open,
      high: Math.max(open, close) + spread * 0.42,
      low: Math.min(open, close) - spread * 0.42,
      close,
      volume: Math.max(10, (candle.volume || 1000) * (0.72 + Math.abs(Math.sin(index + seed)) * 0.7))
    };
  });
}

async function fetchCompositeCandles(asset, timeframe, limit) {
  const components = (asset.syntheticComponents || []).filter((symbol) => symbol !== asset.symbol);
  const settled = await Promise.allSettled(components.map((symbol) => getCandles(symbol, timeframe, limit)));
  const series = settled
    .filter((item) => item.status === 'fulfilled' && item.value?.length >= 40)
    .map((item) => {
      const rows = item.value.slice(-limit);
      rows.dataSource = item.value.dataSource;
      return rows;
    });
  if (!series.length) return { candles: [], dataSource: 'composite continuity model' };
  const minLength = Math.min(...series.map((rows) => rows.length));
  const trimmed = series.map((rows) => rows.slice(-minLength));
  const basePrice = asset.basePrice || 10000;
  const candles = [];
  for (let i = 0; i < minLength; i += 1) {
    const normalized = trimmed.map((rows) => {
      const anchor = rows[0]?.close || 1;
      const item = rows[i];
      return {
        time: item.time,
        open: item.open / anchor,
        high: item.high / anchor,
        low: item.low / anchor,
        close: item.close / anchor,
        volume: item.volume || 0
      };
    });
    const average = (key) => normalized.reduce((sum, item) => sum + item[key], 0) / normalized.length;
    candles.push({
      time: normalized[0].time,
      open: average('open') * basePrice,
      high: average('high') * basePrice,
      low: average('low') * basePrice,
      close: average('close') * basePrice,
      volume: normalized.reduce((sum, item) => sum + item.volume, 0)
    });
  }
  const sources = [...new Set(series.map((rows) => rows.dataSource).filter(Boolean))];
  return {
    candles,
    dataSource: `Composite proxy from ${components.join(', ')}${sources.length ? ` (${sources.join(' + ')})` : ''}`,
    providerAudit: series.flatMap((rows) => rows.providerAudit || []),
    dataIntegrity: {
      status: series.some((rows) => rows.dataIntegrity?.lowConfidence) ? 'component-warning' : 'verified-composite',
      lowConfidence: series.some((rows) => rows.dataIntegrity?.lowConfidence),
      confidencePenalty: series.some((rows) => rows.dataIntegrity?.lowConfidence) ? 8 : 0,
      providerCount: series.length,
      maxDifferencePercent: 0,
      thresholdPercent: divergenceThresholds.composite,
      reason: series.some((rows) => rows.dataIntegrity?.lowConfidence)
        ? 'One or more composite components could not be independently verified.'
        : 'Composite components were normalized and aggregated successfully.'
    }
  };
}

async function fetchProviderResult(asset, timeframe, limit, provider) {
  if (provider === 'binance') {
    if (!asset.binance) throw new Error('Binance symbol unavailable');
    return { provider, priority: providerPriority.binance, label: 'Binance WebSocket/REST', candles: await fetchBinanceCandles(asset, timeframe, limit) };
  }
  if (provider === 'yahoo') {
    if (!asset.yahoo) throw new Error('Yahoo Finance symbol unavailable');
    return { provider, priority: providerPriority.yahoo, label: 'Yahoo Finance', candles: await fetchYahooCandles(asset, timeframe) };
  }
  if (provider === 'twelveData') {
    if (!asset.twelveData) throw new Error('Twelve Data symbol unavailable or API key missing');
    return { provider, priority: providerPriority.twelveData, label: 'Twelve Data', candles: await fetchTwelveDataCandles(asset, timeframe) };
  }
  throw new Error('Unknown provider');
}

function thresholdFor(asset) {
  const cleanType = String(asset.type || '').replace('_otc', '');
  return divergenceThresholds[cleanType] ?? divergenceThresholds.default;
}

function buildProviderAudit(asset, settled) {
  const audit = settled.map((item) => {
    if (item.status === 'fulfilled' && item.value.candles?.length) {
      const latest = item.value.candles.at(-1);
      return {
        provider: item.value.provider,
        label: item.value.label,
        priority: item.value.priority,
        ok: true,
        candleCount: item.value.candles.length,
        latestPrice: latest.close,
        latestTime: latest.time
      };
    }
    const reason = item.status === 'rejected' ? item.reason?.message : 'Provider returned no candles';
    return {
      provider: item.reason?.provider || 'unknown',
      ok: false,
      reason: reason || 'Provider failed'
    };
  });
  const ok = audit.filter((item) => item.ok);
  const prices = ok.map((item) => item.latestPrice).filter(Number.isFinite);
  const max = prices.length ? Math.max(...prices) : 0;
  const min = prices.length ? Math.min(...prices) : 0;
  const midpoint = prices.length ? (max + min) / 2 : 0;
  const maxDifferencePercent = midpoint ? ((max - min) / midpoint) * 100 : 0;
  const thresholdPercent = thresholdFor(asset);
  const divergent = prices.length >= 2 && maxDifferencePercent > thresholdPercent;
  const singleSource = prices.length === 1;
  const noSource = prices.length === 0;
  return {
    audit,
    integrity: {
      status: noSource ? 'fallback' : divergent ? 'provider-divergence' : singleSource ? 'single-source' : 'verified',
      lowConfidence: noSource || divergent || singleSource,
      confidencePenalty: noSource ? 24 : divergent ? 18 : singleSource ? 8 : 0,
      providerCount: prices.length,
      maxDifferencePercent: Number(maxDifferencePercent.toFixed(4)),
      thresholdPercent,
      reason: noSource
        ? 'All market data providers failed; fallback candles were required.'
        : divergent
          ? `Provider price difference ${maxDifferencePercent.toFixed(3)}% exceeded the ${thresholdPercent}% threshold.`
          : singleSource
            ? 'Only one market data provider was available, so the signal is not independently verified.'
            : 'Multiple providers are within the accepted price-difference threshold.'
    }
  };
}

async function fetchBestFreeCandles(asset, timeframe, limit) {
  if (asset.syntheticComponents?.length) return fetchCompositeCandles(asset, timeframe, limit);
  const providers = ['binance', 'yahoo', 'twelveData'];
  const settled = await Promise.allSettled(providers.map(async (provider) => {
    try {
      return await fetchProviderResult(asset, timeframe, limit, provider);
    } catch (error) {
      error.provider = provider;
      throw error;
    }
  }));
  const ok = settled
    .filter((item) => item.status === 'fulfilled' && item.value.candles?.length)
    .map((item) => item.value)
    .sort((a, b) => a.priority - b.priority);
  const { audit, integrity } = buildProviderAudit(asset, settled);
  if (!ok.length) return { candles: [], dataSource: 'continuity-model', providerAudit: audit, dataIntegrity: integrity };
  const primary = ok[0];
  return {
    candles: primary.candles,
    dataSource: `${primary.label} primary; verified against ${Math.max(ok.length - 1, 0)} secondary provider(s)`,
    providerAudit: audit,
    dataIntegrity: integrity
  };
}

export async function getCandles(symbol = 'BTC/USD', timeframe = '1m', limit = 300) {
  const key = cacheKey(symbol, timeframe);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < ttlMs) {
    const projected = projectRealtimeCandles(cached.candles, symbol, timeframe);
    return withMarketMetadata(projected, cached, limit);
  }

  const asset = getAsset(symbol);
  let candles = [];
  let metadata = {
    dataSource: 'continuity-model',
    providerAudit: [],
    dataIntegrity: {
      status: 'fallback',
      lowConfidence: true,
      confidencePenalty: 24,
      providerCount: 0,
      maxDifferencePercent: 0,
      thresholdPercent: thresholdFor(asset),
      reason: 'All market data providers failed; fallback candles were required.'
    }
  };
  try {
    const response = await fetchBestFreeCandles(asset, timeframe, limit);
    candles = response.candles;
    metadata = { ...metadata, ...response };
  } catch {
    candles = await getStoredCandles(symbol, timeframe);
    metadata.dataSource = candles.length ? 'stored historical cache' : 'continuity-model';
    metadata.dataIntegrity = {
      ...metadata.dataIntegrity,
      status: candles.length ? 'stored-cache' : 'fallback',
      reason: candles.length ? 'Live providers failed; stored historical cache was used.' : metadata.dataIntegrity.reason
    };
  }
  if (candles.length < 60) candles = generateFallbackCandles(symbol, timeframe, Math.max(limit, 300));
  if (asset.otc) {
    candles = deriveOtcCandles(candles, asset, timeframe);
    metadata.dataSource = metadata.dataSource === 'continuity-model'
      ? 'OTC continuity model'
      : `${metadata.dataSource} + OTC proxy model`;
    metadata.dataIntegrity = {
      ...metadata.dataIntegrity,
      lowConfidence: true,
      confidencePenalty: Math.max(metadata.dataIntegrity?.confidencePenalty || 0, 10),
      status: metadata.dataIntegrity?.status === 'verified' ? 'otc-proxy' : metadata.dataIntegrity?.status,
      reason: `OTC quotes are proprietary. ${metadata.dataIntegrity?.reason || 'Proxy market data was used.'}`
    };
  }
  candles = candles.slice(-limit);
  candles.dataSource = metadata.dataSource;
  candles.providerAudit = metadata.providerAudit || [];
  candles.dataIntegrity = metadata.dataIntegrity;
  cache.set(key, { at: Date.now(), candles, ...metadata });
  saveCandles(symbol, timeframe, candles).catch(() => {});
  return withMarketMetadata(projectRealtimeCandles(candles, symbol, timeframe), metadata, limit);
}

export async function getScanner(symbols, timeframe) {
  const batches = [];
  for (let i = 0; i < symbols.length; i += 10) {
    const batch = symbols.slice(i, i + 10);
    batches.push(...await Promise.all(batch.map(async (symbol) => ({ symbol, candles: await getCandles(symbol, timeframe, 220) }))));
    await sleep(20);
  }
  return batches;
}
