# Dhanlabh AI Trading Intelligence

Production-oriented Version 2 PWA for probability-based fixed-time trading analysis. It includes a React/Vite/Tailwind frontend, Node/Express backend, WebSocket streaming, modular AI engines, journaling, screenshot analysis, backtesting, PWA install support, and Render deployment config.

It never claims guaranteed profits or 100% accuracy. Every signal is a probability estimate with confidence and risk.

## Run locally

```bash
npm install
npm run build
npm run start
```

Then open `http://localhost:10000`.

For development:

```bash
npm run dev --workspace backend
npm run dev --workspace frontend
```

When running frontend and backend separately in development, set `VITE_API_BASE=http://localhost:10000` for the frontend if you do not serve it through the backend.

## Fixed-time scope

Supported expiries: 15s, 30s, 1m, 2m, 3m, 5m, 10m, and 15m.

Supported assets:

- Forex: EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, USD/CHF, EUR/JPY, EUR/GBP, GBP/JPY
- Crypto: BTC/USD, ETH/USD, BNB/USD, SOL/USD, XRP/USD
- Metals: Gold (XAU/USD), Silver (XAG/USD)

## Data sources

- Multi-source engine priority:
  1. Binance WebSocket/REST when a Binance symbol exists.
  2. Yahoo Finance.
  3. Twelve Data when `TWELVEDATA_API_KEY` is configured.
- All provider responses are normalized into one candle structure before analysis.
- The engine compares latest prices from available providers. If the difference exceeds the asset threshold, the signal is flagged as low-confidence and confidence is penalized.
- Single-source signals are also marked unverified because the platform never treats one provider as fully trusted.
- If an external data source is unavailable, the backend falls back to cached/stored candles so the app remains usable.

## Live chart updates

The backend pushes chart updates over `/ws/market` about every 2.5 seconds. Between public-data refreshes, the latest candle uses a clearly labelled live projection so the graph and values keep moving instead of freezing. If the browser WebSocket is quiet, the frontend automatically falls back to polling.

## AI engines

- Trend AI
- Momentum AI
- Price Action AI
- Pattern/Candlestick AI
- Smart Money AI
- Volume AI
- Market Structure AI
- Risk AI
- Confidence AI

Each engine votes independently. The final recommendation is produced by weighted AI voting and blocked by a no-trade detector when confirmation is weak.

Each AI card displays positive/bullish pressure, negative/bearish pressure, confidence, and a Good/Moderate/Bad quality label.

## Fixed Time Trade planner

The planner is designed for fixed-time trading, so it does not pretend stop-loss/take-profit execution applies directly. It returns:

- Entry price
- Recommended expiry
- Entry window
- Maximum stake-risk percentage
- Invalidation condition
- Payout/latency caution

## Supabase

The app works without Supabase using in-memory storage. For persistent production storage:

1. Create a Supabase project.
2. Run `backend/supabase.schema.sql` in the Supabase SQL editor.
3. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Render or `.env`.

## Deployment

`render.yaml` is included. Push to GitHub, create a Render Blueprint from the repository, and set optional Supabase/TwelveData environment variables.

## Important disclaimer

This software is for educational and analytical use only. It is not financial advice and cannot guarantee trading results.
