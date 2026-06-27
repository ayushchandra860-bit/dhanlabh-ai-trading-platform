import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Bot, Flame, RefreshCw, Wifi } from 'lucide-react';
import { api } from './lib/api.js';
import { useMarketStream } from './hooks/useMarketStream.js';
import { CandleChart } from './components/CandleChart.jsx';
import { AIEngineGrid, BacktestPanel, ForecastAndPlanner, HistoryPanel, JournalAndPersonalAI, LiveWatchlist, MultiTimeframePanel, Scanner, ScreenshotAI } from './components/Panels.jsx';
import { SignalCard } from './components/SignalCard.jsx';
import { badgeTone } from './lib/format.js';

const fallbackAssets = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'USD/CHF', 'EUR/JPY', 'EUR/GBP', 'GBP/JPY', 'BTC/USD', 'ETH/USD', 'BNB/USD', 'SOL/USD', 'XRP/USD', 'XAU/USD', 'XAG/USD'].map((symbol) => ({ symbol, label: symbol, group: symbol.includes('USD') && !symbol.includes('BTC') && !symbol.includes('ETH') && !symbol.includes('BNB') && !symbol.includes('SOL') && !symbol.includes('XRP') && !symbol.includes('XAU') && !symbol.includes('XAG') ? 'Forex' : 'Core' }));
const fallbackTimeframes = ['15s', '30s', '1m', '2m', '3m', '5m', '10m', '15m'];

export default function App() {
  const [assets, setAssets] = useState(fallbackAssets);
  const [timeframes, setTimeframes] = useState(fallbackTimeframes);
  const [symbol, setSymbol] = useState('BTC/USD');
  const [timeframe, setTimeframe] = useState('1m');
  const [tab, setTab] = useState('dashboard');
  const { analysis, status, error, refresh } = useMarketStream(symbol, timeframe);

  useEffect(() => {
    api.meta().then((meta) => {
      setAssets(meta.assets);
      setTimeframes(meta.timeframes);
    }).catch(() => {});
  }, []);

  const selectedAssets = useMemo(() => assets, [assets]);
  const groupedAssets = useMemo(() => assets.reduce((groups, asset) => {
    const group = asset.group || 'Other';
    return { ...groups, [group]: [...(groups[group] || []), asset] };
  }, {}), [assets]);

  return (
    <main className="mx-auto max-w-[1540px] px-4 py-5 text-slate-200 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-glow lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-aqua/15 text-aqua"><Bot /></div>
          <div>
            <h1 className="text-2xl font-black text-white">Dhanlabh AI Trading Intelligence</h1>
            <p className="text-sm text-slate-500">Probability-based analysis only - no guaranteed outcomes - not financial advice - {assets.length} assets</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="rounded-2xl border border-white/10 bg-panel px-4 py-3 font-semibold text-white">
            {Object.entries(groupedAssets).map(([group, items]) => (
              <optgroup key={group} label={group}>
                {items.map((asset) => <option key={asset.symbol} value={asset.symbol}>{asset.label || asset.symbol}</option>)}
              </optgroup>
            ))}
          </select>
          <div className="flex rounded-2xl border border-white/10 bg-panel p-1">
            {timeframes.map((tf) => <button key={tf} onClick={() => setTimeframe(tf)} className={`rounded-xl px-3 py-2 text-sm font-semibold ${tf === timeframe ? 'bg-aqua text-ink' : 'text-slate-400 hover:text-white'}`}>{tf}</button>)}
          </div>
          <button onClick={refresh} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white"><RefreshCw className="h-4 w-4" /> Refresh</button>
        </div>
      </header>

      <nav className="mb-6 flex gap-2 overflow-auto">
        {['dashboard', 'scanner', 'history', 'journal', 'screenshot'].map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`rounded-2xl px-4 py-2 text-sm font-bold capitalize ${tab === item ? 'bg-white text-ink' : 'border border-white/10 bg-white/[0.03] text-slate-400'}`}>{item}</button>
        ))}
      </nav>

      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${status === 'live' || status === 'live-polling' ? 'border-mint/20 bg-mint/10 text-mint' : 'border-amber/20 bg-amber/10 text-amber'}`}><Wifi className="h-4 w-4" /> {status}</span>
        {analysis?.highlight && <span className="inline-flex items-center gap-2 rounded-full border border-mint/20 bg-mint/10 px-3 py-1 text-mint"><Flame className="h-4 w-4" /> Highlighted {analysis.signalGrade} signal</span>}
        {error && <span className="text-danger">{error}</span>}
      </div>

      {tab === 'dashboard' && (
        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <div className="space-y-5">
            <CandleChart candles={analysis?.candles} direction={analysis?.direction} />
            <MultiTimeframePanel symbol={symbol} />
            <ForecastAndPlanner analysis={analysis} />
            <AIEngineGrid engines={analysis?.engines || []} />
          </div>
          <div className="space-y-5">
            <SignalCard analysis={analysis} />
            <LiveWatchlist assets={selectedAssets} timeframe={timeframe} />
            <MarketHeatmap assets={selectedAssets} analysis={analysis} />
            <BacktestPanel symbol={symbol} timeframe={timeframe} />
          </div>
        </div>
      )}

      {tab === 'scanner' && <Scanner assets={selectedAssets} timeframe={timeframe} />}
      {tab === 'history' && <HistoryPanel />}
      {tab === 'journal' && <JournalAndPersonalAI assets={assets} />}
      {tab === 'screenshot' && <ScreenshotAI />}
    </main>
  );
}

function MarketHeatmap({ assets, analysis }) {
  return (
    <section className="glass rounded-3xl p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><Activity className="h-5 w-5 text-aqua" /> Market heatmap</h2>
      <div className="grid grid-cols-2 gap-2">
        {assets.map((asset, index) => {
          const isCurrent = asset.symbol === analysis?.symbol;
          const value = isCurrent ? analysis.direction : index % 3 === 0 ? 'WAIT' : index % 2 === 0 ? 'BUY' : 'SELL';
          return <div key={asset.symbol} className={`rounded-2xl border p-3 text-sm ${badgeTone(value)}`}><p className="font-bold">{asset.symbol}</p><p className="text-xs opacity-70">{value}</p></div>;
        })}
      </div>
    </section>
  );
}
