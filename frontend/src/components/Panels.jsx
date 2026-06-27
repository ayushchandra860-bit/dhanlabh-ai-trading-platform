import React, { useEffect, useState } from 'react';
import { Camera, History, LineChart, NotebookPen, Radar, Target } from 'lucide-react';
import { api } from '../lib/api.js';
import { badgeTone, money, pct } from '../lib/format.js';

export function AIEngineGrid({ engines = [] }) {
  return (
    <section className="glass rounded-3xl p-6">
      <h2 className="mb-4 text-lg font-bold text-white">Multi-AI voting</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {engines.map((engine) => (
          <div key={engine.engine} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-white">{engine.engine}</p>
              <div className="flex gap-2">
                <span className={`rounded-full border px-2 py-1 text-xs ${badgeTone(engine.quality)}`}>{engine.quality || 'Moderate'}</span>
                <span className={`rounded-full border px-2 py-1 text-xs ${badgeTone(engine.vote)}`}>{engine.vote}</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-mint/15 bg-mint/10 p-3">
                <p className="text-[10px] uppercase tracking-wider text-mint/80">Positive</p>
                <p className="text-xl font-black text-mint">{pct(engine.positiveProbability ?? engine.bullishProbability)}</p>
              </div>
              <div className="rounded-xl border border-danger/15 bg-danger/10 p-3">
                <p className="text-[10px] uppercase tracking-wider text-danger/80">Negative</p>
                <p className="text-xl font-black text-danger">{pct(engine.negativeProbability ?? engine.bearishProbability)}</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-danger/20">
              <div className="h-full rounded-full bg-mint" style={{ width: `${engine.positiveProbability ?? engine.bullishProbability}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">Confidence {pct(engine.confidence)} · {engine.polarity || 'Neutral'} pressure</p>
            <p className="mt-3 line-clamp-2 text-sm text-slate-300">{engine.reasons?.[0] || 'Neutral confirmation.'}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ForecastAndPlanner({ analysis }) {
  if (!analysis) return null;
  const planner = analysis.planner || {};
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="glass rounded-3xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><Radar className="h-5 w-5 text-aqua" /> Short-term forecast</h2>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(analysis.forecast || {}).map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">Next {label}</p>
              <p className="text-2xl font-bold text-white">{pct(value)}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="glass rounded-3xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><Target className="h-5 w-5 text-mint" /> Trade planner</h2>
        <div className="mb-3 rounded-2xl border border-mint/15 bg-mint/10 px-4 py-3 text-sm text-mint">
          {planner.tradeType || 'Fixed Time Trade'} · {planner.action || analysis.direction}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Tiny label="Entry price" value={money(planner.entry)} />
          <Tiny label="Expiry" value={planner.expiry || 'Wait'} />
          <Tiny label="Entry window" value={planner.entryWindow || 'Wait'} />
          <Tiny label="Stake risk" value={`${planner.stakeRiskPercent ?? 0}% max`} />
        </div>
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
          <p className="text-xs uppercase tracking-wider text-slate-500">Invalidation</p>
          <p className="mt-1">{planner.invalidation || 'Wait for a cleaner setup.'}</p>
          <p className="mt-3 text-xs text-slate-500">{planner.payoutRule}</p>
        </div>
      </div>
    </section>
  );
}

function Tiny({ label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold text-white">{value}</p></div>;
}

export function Scanner({ assets, timeframe }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    api.scanner(assets.map((asset) => asset.symbol), timeframe).then((data) => setRows(data.results)).finally(() => setLoading(false));
  }, [assets, timeframe]);
  return (
    <section className="glass rounded-3xl p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><LineChart className="h-5 w-5 text-aqua" /> Live scanner</h2>
      {loading && <p className="text-sm text-slate-500">Scanning all supported assets…</p>}
      <div className="mt-3 grid gap-2">
        {rows.map((row) => (
          <div key={row.symbol} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm">
            <span className="font-semibold text-white">{row.symbol}</span>
            <span className={`rounded-full border px-2 py-1 text-xs ${badgeTone(row.direction)}`}>{row.direction}</span>
            <span className="text-slate-300">{pct(row.confidence)}</span>
            <span className={`text-xs ${row.highlight ? 'text-mint' : 'text-slate-500'}`}>{row.signalGrade}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LiveWatchlist({ assets, timeframe }) {
  const symbols = assets.slice(0, 18).map((asset) => asset.symbol);
  const [rows, setRows] = useState([]);
  const [updatedAt, setUpdatedAt] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = () => api.liveWatchlist(symbols, timeframe).then((data) => {
      if (cancelled) return;
      setRows(data.items || []);
      setUpdatedAt(new Date().toLocaleTimeString());
    }).catch(() => {});
    load();
    const timer = setInterval(load, 4500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [timeframe, symbols.join('|')]);

  return (
    <section className="glass rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">Live watchlist</h2>
        <span className="text-xs text-slate-500">Updated {updatedAt || '—'}</span>
      </div>
      <div className="grid max-h-[420px] gap-2 overflow-auto">
        {rows.map((row) => (
          <div key={row.symbol} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm">
            <div>
              <p className="font-semibold text-white">{row.symbol}</p>
              <p className="text-xs text-slate-500">v{row.marketVersion} · {row.tickDirection} · {row.analysisLatencyMs}ms</p>
            </div>
            <span className={`rounded-full border px-2 py-1 text-xs ${badgeTone(row.direction)}`}>{row.direction}</span>
            <span className="text-slate-300">{pct(row.confidence)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MultiTimeframePanel({ symbol }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => api.multiTimeframe(symbol).then((payload) => {
      if (!cancelled) setData(payload);
    }).catch(() => {});
    load();
    const timer = setInterval(load, 6000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [symbol]);

  if (!data) return null;
  return (
    <section className="glass rounded-3xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">Multi-timeframe comparison</h2>
        <span className={`rounded-full border px-3 py-1 text-sm ${badgeTone(data.dominantDirection)}`}>
          {data.dominantDirection} alignment {pct(data.alignment)}
        </span>
      </div>
      <div className="grid gap-2 md:grid-cols-5">
        {data.rows.map((row) => (
          <div key={row.timeframe} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs text-slate-500">{row.timeframe}</p>
            <p className={`mt-1 text-lg font-black ${row.direction === 'BUY' ? 'text-mint' : row.direction === 'SELL' ? 'text-danger' : 'text-amber'}`}>{row.direction}</p>
            <p className="mt-1 text-xs text-slate-400">Bull {pct(row.bullishProbability)} / Bear {pct(row.bearishProbability)}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-danger/20">
              <div className="h-full rounded-full bg-mint" style={{ width: `${row.bullishProbability}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HistoryPanel() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.history().then((data) => setItems(data.items || [])); }, []);
  return (
    <section className="glass rounded-3xl p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><History className="h-5 w-5 text-aqua" /> Signal history</h2>
      <div className="grid max-h-[420px] gap-2 overflow-auto">
        {items.slice(0, 18).map((item, index) => (
          <div key={`${item.generatedAt || item.generated_at}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">{item.symbol}</span>
              <span className={`rounded-full border px-2 py-1 text-xs ${badgeTone(item.direction)}`}>{item.direction}</span>
            </div>
            <p className="mt-1 text-slate-500">Confidence {pct(item.confidence)} · Risk {item.riskLevel || item.risk_level}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BacktestPanel({ symbol, timeframe }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const run = () => {
    setLoading(true);
    api.backtest(symbol, timeframe).then(setResult).finally(() => setLoading(false));
  };
  return (
    <section className="glass rounded-3xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">Backtesting</h2>
        <button onClick={run} className="rounded-xl bg-aqua px-4 py-2 text-sm font-bold text-ink">{loading ? 'Running…' : 'Run test'}</button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Tiny label="Win rate" value={result ? pct(result.winRate) : '—'} />
        <Tiny label="Profit factor" value={result?.profitFactor ?? '—'} />
        <Tiny label="Drawdown" value={result ? money(result.drawdown) : '—'} />
        <Tiny label="Trades" value={result?.trades ?? '—'} />
      </div>
    </section>
  );
}

export function JournalAndPersonalAI({ assets }) {
  const [journal, setJournal] = useState([]);
  const [personal, setPersonal] = useState(null);
  const [form, setForm] = useState({ symbol: assets[0]?.symbol || 'BTC/USD', direction: 'BUY', entry: '', exit: '', result: '', notes: '' });
  const refresh = () => Promise.all([api.journal(), api.personalAI()]).then(([j, p]) => { setJournal(j.items || []); setPersonal(p); });
  useEffect(() => { refresh(); }, []);
  const submit = async (event) => {
    event.preventDefault();
    await api.addJournal({ ...form, entry: Number(form.entry), exit: Number(form.exit), result: Number(form.result) });
    setForm({ ...form, entry: '', exit: '', result: '', notes: '' });
    refresh();
  };
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="glass rounded-3xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><NotebookPen className="h-5 w-5 text-mint" /> Trade journal</h2>
        <form onSubmit={submit} className="grid gap-3">
          <select value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} className="rounded-xl border border-white/10 bg-panel p-3 text-white">{assets.map((asset) => <option key={asset.symbol}>{asset.symbol}</option>)}</select>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} className="rounded-xl border border-white/10 bg-panel p-3 text-white"><option>BUY</option><option>SELL</option></select>
            <input required placeholder="P/L result" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} className="rounded-xl border border-white/10 bg-panel p-3 text-white" />
            <input required placeholder="Entry" value={form.entry} onChange={(e) => setForm({ ...form, entry: e.target.value })} className="rounded-xl border border-white/10 bg-panel p-3 text-white" />
            <input placeholder="Exit" value={form.exit} onChange={(e) => setForm({ ...form, exit: e.target.value })} className="rounded-xl border border-white/10 bg-panel p-3 text-white" />
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-20 rounded-xl border border-white/10 bg-panel p-3 text-white" />
          <button className="rounded-xl bg-mint px-4 py-3 font-bold text-ink">Save trade</button>
        </form>
      </div>
      <div className="glass rounded-3xl p-6">
        <h2 className="mb-4 text-lg font-bold text-white">Personal AI</h2>
        <div className="grid grid-cols-2 gap-3">
          <Tiny label="Win rate" value={personal ? pct(personal.winRate) : '—'} />
          <Tiny label="Trades" value={personal?.trades ?? '—'} />
          <Tiny label="Best asset" value={personal?.bestAsset || '—'} />
          <Tiny label="Worst asset" value={personal?.worstAsset || '—'} />
        </div>
        <div className="mt-4 max-h-48 overflow-auto">
          {journal.slice(0, 6).map((item) => <p key={item.id} className="border-b border-white/10 py-2 text-sm text-slate-400">{item.symbol} · {item.direction} · P/L {item.result}</p>)}
        </div>
      </div>
    </section>
  );
}

export function ScreenshotAI() {
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState('');
  const analyze = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    setPreview(imageUrl);
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(640, img.width);
      canvas.height = Math.round((canvas.width / img.width) * img.height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let green = 0, red = 0, contrast = 0;
      for (let i = 0; i < data.length; i += 16) {
        red += data[i] > data[i + 1] + 18 ? 1 : 0;
        green += data[i + 1] > data[i] + 18 ? 1 : 0;
        contrast += Math.abs(data[i] - data[i + 1]) + Math.abs(data[i + 1] - data[i + 2]);
      }
      const points = [];
      for (let x = 0; x < canvas.width; x += Math.max(6, Math.floor(canvas.width / 80))) {
        let bestY = canvas.height / 2;
        let bestBright = 0;
        for (let y = 0; y < canvas.height; y += 4) {
          const p = (y * canvas.width + x) * 4;
          const bright = data[p] + data[p + 1] + data[p + 2];
          if (bright > bestBright) { bestBright = bright; bestY = y; }
        }
        points.push(bestY);
      }
      const trendSlope = points.length > 1 ? ((points[0] - points.at(-1)) / canvas.height) * 100 : 0;
      const stats = {
        greenDominance: (green / Math.max(red + green, 1)) * 100,
        redDominance: (red / Math.max(red + green, 1)) * 100,
        contrast: contrast / Math.max(data.length / 16, 1) / 4,
        volatility: Math.max(...points) - Math.min(...points),
        trendSlope
      };
      setResult(await api.screenshot(stats));
    };
    img.src = imageUrl;
  };
  return (
    <section className="glass rounded-3xl p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><Camera className="h-5 w-5 text-aqua" /> Screenshot AI</h2>
      <input type="file" accept="image/*" onChange={analyze} className="w-full rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-4 text-sm text-slate-300" />
      {preview && <img src={preview} alt="Uploaded market screenshot" className="mt-4 max-h-64 w-full rounded-2xl object-cover" />}
      {result && <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
        <p className={`mb-2 inline-flex rounded-full border px-3 py-1 ${badgeTone(result.direction)}`}>{result.direction} · {pct(result.confidence)}</p>
        <p>{result.reason}</p>
        <p className="mt-2 text-slate-500">Trend: {result.trend} · Risk: {result.riskLevel}</p>
      </div>}
    </section>
  );
}
