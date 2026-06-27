import WebSocket, { WebSocketServer } from 'ws';
import { ASSETS } from '../config/assets.js';
import { analyzeMultiTimeframe, analyzeRealtime, analyzeWatchlist } from '../services/realtimeAnalysisService.js';

function binanceStream(symbol) {
  const asset = ASSETS.find((item) => item.symbol === symbol);
  return asset?.binance ? `${asset.binance.toLowerCase()}@kline_1m` : null;
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({ server, path: '/ws/market' });
  wss.on('connection', (client, request) => {
    const url = new URL(request.url, 'http://localhost');
    const symbol = url.searchParams.get('symbol') || 'BTC/USD';
    const timeframe = url.searchParams.get('timeframe') || '1m';
    const mode = url.searchParams.get('mode') || 'analysis';
    const stream = binanceStream(symbol);
    let upstream;
    let heartbeat;
    let pingTimer;
    let sending = false;
    let lastSentAt = 0;
    let closed = false;
    client.isAlive = true;
    client.on('pong', () => {
      client.isAlive = true;
    });

    const sendAnalysis = async (force = false) => {
      if (closed || client.readyState !== WebSocket.OPEN) return;
      if (sending) return;
      if (!force && Date.now() - lastSentAt < 1200) return;
      sending = true;
      try {
        const data = mode === 'watchlist'
          ? await analyzeWatchlist({ symbols: ASSETS.slice(0, 24).map((asset) => asset.symbol), timeframe })
          : mode === 'multi-timeframe'
            ? await analyzeMultiTimeframe({ symbol })
            : await analyzeRealtime({ symbol, timeframe, persist: false });
        if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: mode, data }));
        lastSentAt = Date.now();
      } catch (error) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'error', error: error.message || 'Realtime analysis failed' }));
        }
      } finally {
        sending = false;
      }
    };

    heartbeat = setInterval(() => sendAnalysis().catch(() => {}), 2500);
    if (stream) {
      const connect = () => {
        if (closed || client.readyState !== WebSocket.OPEN) return;
        upstream = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}`);
        upstream.on('message', () => sendAnalysis().catch(() => {}));
        upstream.on('close', () => {
          if (!closed && client.readyState === WebSocket.OPEN) setTimeout(connect, 1500);
        });
        upstream.on('error', () => {
          if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) upstream.close();
        });
      };
      connect();
    }
    pingTimer = setInterval(() => {
      if (closed) return;
      if (client.isAlive === false) {
        client.terminate();
        return;
      }
      client.isAlive = false;
      if (client.readyState === WebSocket.OPEN) client.ping();
    }, 15000);
    sendAnalysis(true).catch(() => {});

    client.on('close', () => {
      closed = true;
      if (upstream) upstream.close();
      if (heartbeat) clearInterval(heartbeat);
      if (pingTimer) clearInterval(pingTimer);
    });
  });
  return wss;
}
