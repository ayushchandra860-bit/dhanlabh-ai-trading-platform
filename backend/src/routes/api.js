import express from 'express';
import jwt from 'jsonwebtoken';
import { ASSETS, TIMEFRAMES } from '../config/assets.js';
import { runFullAnalysis } from '../ai/ensemble.js';
import { getCandles, getScanner } from '../services/marketDataService.js';
import { listJournal, listPredictions, saveJournal, storageMode } from '../services/storageService.js';
import { runBacktest } from '../services/backtestService.js';
import { analyzeScreenshot } from '../services/screenshotService.js';
import { analyzeMultiTimeframe, analyzeRealtime, analyzeWatchlist, realtimeEngineStats } from '../services/realtimeAnalysisService.js';

export const api = express.Router();

api.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'Dhanlabh AI Trading Platform', version: '2.0.0', storageMode, realtime: realtimeEngineStats(), timestamp: new Date().toISOString() });
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
    const byAsset = Object.groupBy ? Object.groupBy(completed, (item) => item.symbol || 'Unknown') : completed.reduce((acc, item) => ({ ...acc, [item.symbol || 'Unknown']: [...(acc[item.symbol || 'Unknown'] || []), item] }), {});
    const assetStats = Object.entries(byAsset).map(([asset, rows]) => ({
      asset,
      winRate: rows.length ? Math.round(rows.filter((row) => Number(row.result) > 0).length / rows.length * 100) : 0,
      trades: rows.length
    })).sort((a, b) => b.winRate - a.winRate);
    res.json({
      trades: completed.length,
      winRate: completed.length ? Math.round(completed.filter((item) => Number(item.result) > 0).length / completed.length * 100) : 0,
      bestAsset: assetStats[0]?.asset || 'Not enough data',
      worstAsset: assetStats.at(-1)?.asset || 'Not enough data',
      bestTradingHours: 'Needs more journal samples',
      worstTradingHours: 'Needs more journal samples',
      assetStats
    });
  } catch (error) {
    next(error);
  }
});

api.post('/screenshot/analyze', (req, res) => {
  res.json(analyzeScreenshot(req.body?.stats));
});
