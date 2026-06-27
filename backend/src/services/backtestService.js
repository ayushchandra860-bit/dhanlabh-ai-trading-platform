import { runFullAnalysis } from '../ai/ensemble.js';
import { round } from '../utils/math.js';
import { saveBacktest } from './storageService.js';

export async function runBacktest({ symbol, timeframe, candles }) {
  const trades = [];
  const step = Math.max(6, Math.floor(candles.length / 42));
  for (let i = 120; i < candles.length - 8; i += step) {
    const sample = candles.slice(0, i);
    const analysis = await runFullAnalysis({ symbol, timeframe, candles: sample, persist: false });
    if (!analysis.highlight || analysis.direction === 'WAIT' || analysis.direction === 'NO TRADE') continue;
    const entry = candles[i].close;
    const exit = candles[Math.min(candles.length - 1, i + 6)].close;
    const pnl = analysis.direction === 'BUY' ? exit - entry : entry - exit;
    trades.push({ direction: analysis.direction, entry, exit, pnl, confidence: analysis.confidence });
  }
  const wins = trades.filter((trade) => trade.pnl > 0);
  const losses = trades.filter((trade) => trade.pnl <= 0);
  const grossWin = wins.reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));
  let equity = 0;
  let peak = 0;
  let drawdown = 0;
  for (const trade of trades) {
    equity += trade.pnl;
    peak = Math.max(peak, equity);
    drawdown = Math.min(drawdown, equity - peak);
  }
  const result = {
    symbol,
    timeframe,
    trades: trades.length,
    winRate: trades.length ? round((wins.length / trades.length) * 100, 1) : 0,
    profitFactor: grossLoss ? round(grossWin / grossLoss, 2) : grossWin > 0 ? 9.99 : 0,
    drawdown: round(Math.abs(drawdown), 6),
    accuracy: trades.length ? round((wins.length / trades.length) * 100, 1) : 0
  };
  await saveBacktest(result).catch(() => {});
  return result;
}
