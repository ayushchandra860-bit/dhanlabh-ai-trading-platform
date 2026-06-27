import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const memory = {
  predictions: [],
  journal: [],
  backtests: [],
  candles: new Map()
};

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

export const storageMode = supabase ? 'supabase' : 'memory';

export async function savePrediction(payload) {
  const record = { ...payload, created_at: new Date().toISOString() };
  if (supabase) {
    const { error } = await supabase.from('predictions').insert({
      symbol: payload.symbol,
      timeframe: payload.timeframe,
      generated_at: payload.generatedAt,
      direction: payload.direction,
      trade_recommendation: payload.tradeRecommendation,
      bullish_probability: payload.bullishProbability,
      bearish_probability: payload.bearishProbability,
      confidence: payload.confidence,
      risk_level: payload.riskLevel,
      signal_grade: payload.signalGrade,
      payload
    });
    if (error) throw error;
  }
  memory.predictions.unshift(record);
  memory.predictions = memory.predictions.slice(0, 500);
  return record;
}

export async function listPredictions(limit = 50) {
  if (supabase) {
    const { data, error } = await supabase.from('predictions').select('*').order('created_at', { ascending: false }).limit(limit);
    if (!error && data) return data.map((row) => row.payload ?? row);
  }
  return memory.predictions.slice(0, limit);
}

export async function saveJournal(entry) {
  const record = { id: randomUUID(), ...entry, created_at: new Date().toISOString() };
  if (supabase) {
    const { error } = await supabase.from('trade_journal').insert(record);
    if (error) throw error;
  }
  memory.journal.unshift(record);
  return record;
}

export async function listJournal() {
  if (supabase) {
    const { data, error } = await supabase.from('trade_journal').select('*').order('created_at', { ascending: false }).limit(500);
    if (!error && data) return data;
  }
  return memory.journal;
}

export async function saveCandles(symbol, timeframe, candles) {
  const key = `${symbol}:${timeframe}`;
  memory.candles.set(key, candles.slice(-800));
  if (supabase) {
    const rows = candles.slice(-200).map((candle) => ({ symbol, timeframe, ...candle }));
    await supabase.from('market_candles').upsert(rows, { onConflict: 'symbol,timeframe,time' });
  }
}

export async function getStoredCandles(symbol, timeframe) {
  const key = `${symbol}:${timeframe}`;
  if (supabase) {
    const { data, error } = await supabase
      .from('market_candles')
      .select('*')
      .eq('symbol', symbol)
      .eq('timeframe', timeframe)
      .order('time', { ascending: true })
      .limit(800);
    if (!error && data?.length) return data.map(({ symbol: _symbol, timeframe: _timeframe, ...candle }) => candle);
  }
  return memory.candles.get(key) ?? [];
}

export async function saveBacktest(payload) {
  const record = { id: randomUUID(), ...payload, created_at: new Date().toISOString() };
  if (supabase) {
    const { error } = await supabase.from('backtests').insert(record);
    if (error) throw error;
  }
  memory.backtests.unshift(record);
  return record;
}
