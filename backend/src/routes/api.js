import express from 'express';
import jwt from 'jsonwebtoken';
import { ASSETS, TIMEFRAMES } from '../config/assets.js';
import { runFullAnalysis } from '../ai/ensemble.js';
import { getCandles, getScanner } from '../services/marketDataService.js';
import { listJournal, listPredictions, saveJournal, storageMode, updatePredictionOutcome } from '../services/storageService.js';
import { runBacktest } from '../services/backtestService.js';
import { analyzeScreenshot } from '../services/screenshotService.js';
import { analyzeMultiTimeframe, analyzeRealtime, analyzeWatchlist, realtimeEngineStats } from '../services/realtimeAnalysisService.js';

export const api = express.Router();

api.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

api.get('/meta', (_req, res) => {
  res.json({ assets: ASSETS, timeframes: Object.keys(TIMEFRAMES), disclaimer: 'Probability-based market analysis only. No guaranteed outcomes or financial advice.' });
});

api.get('/auth/guest-token', (_req, res) => {
  const token = jwt.sign({ role: 'guest', scope: 'analysis' }, process.env.JWT_SECRET || 'local-development-secret', { expiresIn: '12h' });
  res.json({ token });
});

api.get('/market/candles', async (req, res, next) => {
  try {
    const candles = await getCandles(req.query.symbol, req.query.timeframe, Number(req.query.limit || 300));
    res.json({ candles });
  } catch (error) {
    next(error);
  }
});

api.get('/analysis', async (req, res, next) => {
  try {
    const symbol = req.query.symbol || 'BTC/USD';
    const timeframe = req.query.timeframe || '1m';
    const force = req.query.force === 'true';
    res.json(await analyzeRealtime({ symbol, timeframe, force, persist: true }));
  } catch (error) {
    next(error);
  }
});

api.get('/realtime/status', (_req, res) => {
  res.json(realtimeEngineStats());
});

api.get('/watchlist/live', async (req, res, next) => {
  try {
    const timeframe = req.query.timeframe || '1m';
    const symbols = req.query.symbols ? String(req.query.symbols).split(',') : ASSETS.slice(0, 24).map((asset) => asset.symbol);
    res.json({ items: await analyzeWatchlist({ symbols, timeframe }) });
  } catch (error) {
    next(error);
  }
});

api.get('/multi-timeframe', async (req, res, next) => {
  try {
    const symbol = req.query.symbol || 'BTC/USD';
    const timeframes = req.query.timeframes ? String(req.query.timeframes).split(',') : ['15s', '30s', '1m', '5m', '15m'];
    res.json(await analyzeMultiTimeframe({ symbol, timeframes }));
  } catch (error) {
    next(error);
  }
});

api.get('/scanner', async (req, res, next) => {
  try {
    const timeframe = req.query.timeframe || '1m';
    const symbols = (req.query.symbols ? String(req.query.symbols).split(',') : ASSETS.map((asset) => asset.symbol)).slice(0, 60);
    const results = await analyzeWatchlist({ symbols, timeframe });
    res.json({ results });
  } catch (error) {
    next(error);
  }
});

api.get('/signals/history', async (_req, res, next) => {
  try {
    res.json({ items: await listPredictions(80) });
  } catch (error) {
    next(error);
  }
});

api.post('/signals/resolve', async (req, res, next) => {
  try {
    const { symbol, timeframe, generatedAt, actualMarketResult, winLoss } = req.body || {};
    if (!symbol || !timeframe || !winLoss) {
      return res.status(400).json({ error: 'symbol, timeframe, and winLoss are required.' });
    }
    res.json(await updatePredictionOutcome({ symbol, timeframe, generatedAt, actualMarketResult, winLoss }));
  } catch (error) {
    next(error);
  }
});

api.post('/backtest', async (req, res, next) => {
  try {
    const symbol = req.body.symbol || 'BTC/USD';
    const timeframe = req.body.timeframe || '1m';
    const candles = await getCandles(symbol, timeframe, 500);
    res.json(await runBacktest({ symbol, timeframe, candles }));
  } catch (error) {
    next(error);
  }
});

api.get('/journal', async (_req, res, next) => {
  try {
    res.json({ items: await listJournal() });
  } catch (error) {
    next(error);
  }
});

api.post('/journal', async (req, res, next) => {
  try {
    res.status(201).json(await saveJournal(req.body));
  } catch (error) {
    next(error);
  }
});

api.get('/personal-ai', async (_req, res, next) => {
  try {
    const journal = await listJournal();
    const completed = journal.filter((item) => Number.isFinite(Number(item.result)));
    const groupBy = (keyFn) => completed.reduce((acc, item) => {
      const key = keyFn(item) || 'Unknown';
      acc[key] = [...(acc[key] || []), item];
      return acc;
    }, {});
    const stats = (groups, labelKey) => Object.entries(groups).map(([label, rows]) => ({
      [labelKey]: label,
      winRate: rows.length ? Math.round(rows.filter((row) => Number(row.result) > 0).length / rows.length * 100) : 0,
      trades: rows.length
    })).sort((a, b) => b.winRate - a.winRate || b.trades - a.trades);
    const sessionFor = (item) => {
      if (item.session) return item.session;
      const hour = new Date(item.created_at || Date.now()).getUTCHours();
      if (hour < 8) return 'Asia';
      if (hour < 14) return 'Europe';
      return 'US';
    };
    const assetStats = stats(groupBy((item) => item.symbol), 'asset');
    const expiryStats = stats(groupBy((item) => item.timeframe || item.expiry), 'expiry');
    const sessionStats = stats(groupBy(sessionFor), 'session');
    let bestWinStreak = 0;
    let currentWinStreak = 0;
    let lossStreak = 0;
    for (const row of [...completed].reverse()) {
      if (Number(row.result) > 0) {
        currentWinStreak += 1;
        lossStreak = 0;
        bestWinStreak = Math.max(bestWinStreak, currentWinStreak);
      } else {
        lossStreak += 1;
        currentWinStreak = 0;
      }
    }
    res.json({
      trades: completed.length,
      winRate: completed.length ? Math.round(completed.filter((item) => Number(item.result) > 0).length / completed.length * 100) : 0,
      bestAsset: assetStats[0]?.asset || 'Not enough data',
      worstAsset: assetStats.at(-1)?.asset || 'Not enough data',
      bestExpiry: expiryStats[0]?.expiry || 'Not enough data',
      worstExpiry: expiryStats.at(-1)?.expiry || 'Not enough data',
      bestSession: sessionStats[0]?.session || 'Not enough data',
      worstSession: sessionStats.at(-1)?.session || 'Not enough data',
      bestWinStreak,
      currentWinStreak,
      lossStreak,
      assetStats,
      expiryStats,
      sessionStats
    });
  } catch (error) {
    next(error);
  }
});

api.post('/screenshot/analyze', (req, res) => {
  res.json(analyzeScreenshot(req.body?.stats));
});
