function inferHttpBase() {
  if (import.meta.env.VITE_API_BASE) return import.meta.env.VITE_API_BASE.replace(/\/$/, '');
  if (typeof window === 'undefined') return '';
  const { hostname, port, protocol } = window.location;
  const isViteDev = ['5173', '4173'].includes(port);
  if (isViteDev && ['localhost', '127.0.0.1'].includes(hostname)) {
    return `${protocol}//${hostname}:10000`;
  }
  return '';
}

const API_BASE = inferHttpBase();

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 12000);
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options,
    signal: options.signal || controller.signal
  }).finally(() => clearTimeout(timeout));
  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();
  const isJson = contentType.includes('application/json') || raw.trim().startsWith('{') || raw.trim().startsWith('[');
  const body = isJson && raw ? JSON.parse(raw) : raw;
  if (!response.ok || !isJson) {
    const detail = typeof body === 'object' ? body.error : body;
    throw new Error(detail || (!isJson ? 'Server returned HTML instead of JSON. Check API routing or backend URL.' : `Request failed: ${response.status}`));
  }
  return body;
}

export const api = {
  meta: () => request('/api/meta'),
  analysis: (symbol, timeframe) => request(`/api/analysis?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`),
  realtimeStatus: () => request('/api/realtime/status'),
  liveWatchlist: (symbols, timeframe) => request(`/api/watchlist/live?timeframe=${encodeURIComponent(timeframe)}&symbols=${encodeURIComponent(symbols.join(','))}`),
  multiTimeframe: (symbol, timeframes = ['15s', '30s', '1m', '5m', '15m']) => request(`/api/multi-timeframe?symbol=${encodeURIComponent(symbol)}&timeframes=${encodeURIComponent(timeframes.join(','))}`),
  scanner: (symbols, timeframe) => request(`/api/scanner?timeframe=${encodeURIComponent(timeframe)}&symbols=${encodeURIComponent(symbols.join(','))}`),
  history: () => request('/api/signals/history'),
  backtest: (symbol, timeframe) => request('/api/backtest', { method: 'POST', body: JSON.stringify({ symbol, timeframe }) }),
  journal: () => request('/api/journal'),
  addJournal: (entry) => request('/api/journal', { method: 'POST', body: JSON.stringify(entry) }),
  personalAI: () => request('/api/personal-ai'),
  screenshot: (stats) => request('/api/screenshot/analyze', { method: 'POST', body: JSON.stringify({ stats }) })
};

export function wsUrl(symbol, timeframe) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const devBase = ['5173', '4173'].includes(window.location.port) && ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? `${protocol}//${window.location.hostname}:10000`
    : `${protocol}//${window.location.host}`;
  const base = (import.meta.env.VITE_WS_BASE || devBase).replace(/\/$/, '');
  return `${base}/ws/market?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`;
}
