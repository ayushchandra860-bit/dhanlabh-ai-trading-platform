const forex = [
  ['EUR/USD', 'EURUSD=X', 'EUR/USD', 1.08],
  ['GBP/USD', 'GBPUSD=X', 'GBP/USD', 1.27],
  ['USD/JPY', 'JPY=X', 'USD/JPY', 157],
  ['AUD/USD', 'AUDUSD=X', 'AUD/USD', 0.66],
  ['USD/CAD', 'CAD=X', 'USD/CAD', 1.37],
  ['USD/CHF', 'CHF=X', 'USD/CHF', 0.9],
  ['EUR/JPY', 'EURJPY=X', 'EUR/JPY', 170],
  ['EUR/GBP', 'EURGBP=X', 'EUR/GBP', 0.85],
  ['GBP/JPY', 'GBPJPY=X', 'GBP/JPY', 200]
].map(([symbol, yahoo, twelveData, basePrice]) => ({
  symbol,
  label: symbol,
  type: 'forex',
  group: 'Forex',
  market: 'live',
  yahoo,
  twelveData,
  basePrice
}));

const crypto = [
  ['BTC/USD', 'BTCUSDT', 'BTC-USD', 'BTC/USD', 64000],
  ['ETH/USD', 'ETHUSDT', 'ETH-USD', 'ETH/USD', 3200],
  ['BNB/USD', 'BNBUSDT', 'BNB-USD', 'BNB/USD', 590],
  ['SOL/USD', 'SOLUSDT', 'SOL-USD', 'SOL/USD', 145],
  ['XRP/USD', 'XRPUSDT', 'XRP-USD', 'XRP/USD', 0.5]
].map(([symbol, binance, yahoo, twelveData, basePrice]) => ({
  symbol,
  label: symbol,
  type: 'crypto',
  group: 'Crypto',
  market: 'live',
  binance,
  yahoo,
  twelveData,
  basePrice
}));

const metals = [
  ['XAU/USD', 'Gold', 'GC=F', 'XAU/USD', 2350],
  ['XAG/USD', 'Silver', 'SI=F', 'XAG/USD', 30]
].map(([symbol, label, yahoo, twelveData, basePrice]) => ({
  symbol,
  label,
  type: 'metal',
  group: 'Metals',
  market: 'live',
  yahoo,
  twelveData,
  basePrice
}));

export const ASSETS = [...forex, ...crypto, ...metals];

export const TIMEFRAMES = {
  '15s': { seconds: 15, label: '15 Seconds', binance: '1m', yahooRange: '1d', yahooInterval: '1m' },
  '30s': { seconds: 30, label: '30 Seconds', binance: '1m', yahooRange: '1d', yahooInterval: '1m' },
  '1m': { seconds: 60, label: '1 Minute', binance: '1m', yahooRange: '1d', yahooInterval: '1m' },
  '2m': { seconds: 120, label: '2 Minutes', binance: '1m', yahooRange: '5d', yahooInterval: '1m' },
  '3m': { seconds: 180, label: '3 Minutes', binance: '3m', yahooRange: '5d', yahooInterval: '1m' },
  '5m': { seconds: 300, label: '5 Minutes', binance: '5m', yahooRange: '5d', yahooInterval: '5m' },
  '10m': { seconds: 600, label: '10 Minutes', binance: '5m', yahooRange: '5d', yahooInterval: '5m' },
  '15m': { seconds: 900, label: '15 Minutes', binance: '15m', yahooRange: '5d', yahooInterval: '15m' }
};

export function getAsset(symbol) {
  return ASSETS.find((asset) => asset.symbol === symbol) ?? ASSETS[0];
}

export function getTimeframe(tf) {
  return TIMEFRAMES[tf] ?? TIMEFRAMES['1m'];
}
