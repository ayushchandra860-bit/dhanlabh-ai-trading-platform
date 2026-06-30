import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Clock3,
  Crosshair,
  Gauge,
  History,
  Maximize2,
  Monitor,
  Move,
  Play,
  Power,
  Save,
  Settings,
  ShieldAlert,
  Square,
  StickyNote,
  Wifi,
  X
} from 'lucide-react';
import { findOlympTradeSource, detectOlympChartRegion } from './vision/chartDetector.js';
import { analyzeChartImage } from './vision/chartVision.js';
import { inspectVisibleText } from './vision/ocrEngine.js';

const desktop = window.dhanlabhDesktop;

const defaultOverlay = {
  width: 300,
  height: 230,
  x: 80,
  y: 80,
  opacity: 0.82,
  compact: false,
  clickThrough: true
};

const defaultAnalysis = {
  decision: 'WAIT',
  trend: 'Waiting',
  support: '-',
  resistance: '-',
  pattern: '-',
  momentum: '-',
  indicatorAlignment: [],
  marketStructure: '-',
  risk: '-',
  confidence: 0,
  explanation: ['Waiting for Olymp Trade chart detection.']
};

const defaultRuntime = {
  live: false,
  fps: 0,
  processingTime: 0,
  lastUpdated: null,
  captureStatus: 'Waiting for Olymp Trade',
  aiStatus: 'Auto-detecting Olymp Trade',
  ocrStatus: 'Visual OCR standby',
  chartStatus: 'Waiting',
  staleFrames: 0,
  failures: 0
};

function tone(value) {
  if (['BUY', 'SELL'].includes(value)) return 'text-aqua border-aqua/25 bg-aqua/10';
  if (['Bullish', 'Low', 'Strong'].includes(value)) return 'text-mint border-mint/25 bg-mint/10';
  if (['Bearish', 'High'].includes(value)) return 'text-danger border-danger/25 bg-danger/10';
  return 'text-amber border-amber/25 bg-amber/10';
}

function round(value, digits = 0) {
  return Number(Number(value || 0).toFixed(digits));
}

function formatTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function fingerprintFrame(imageData, width, height) {
  const { data } = imageData;
  const pixelCount = width * height;
  const stride = Math.max(4, Math.floor(pixelCount / 4500) * 4);
  let hash = 2166136261;
  hash ^= width;
  hash = Math.imul(hash, 16777619);
  hash ^= height;
  hash = Math.imul(hash, 16777619);
  for (let index = 0; index < data.length; index += stride) {
    const bucket = ((data[index] + data[index + 1] + data[index + 2]) / 24) | 0;
    hash ^= bucket;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function readFullFrame(sourceImage) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      resolve({
        canvas,
        ctx,
        imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
        width: canvas.width,
        height: canvas.height
      });
    };
    img.onerror = () => reject(new Error('Olymp Trade window image could not be read. Retrying...'));
    img.src = sourceImage;
  });
}

function cropCanvas(fullFrame, region) {
  const sx = Math.max(0, Math.round(region.x));
  const sy = Math.max(0, Math.round(region.y));
  const sw = Math.max(20, Math.round(region.width));
  const sh = Math.max(20, Math.round(region.height));
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(fullFrame.canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  const imageData = ctx.getImageData(0, 0, sw, sh);
  return {
    dataUrl: canvas.toDataURL('image/png'),
    imageData,
    width: sw,
    height: sh,
    hash: fingerprintFrame(imageData, sw, sh)
  };
}

function hasUsableChartSignal(analysis) {
  const detected = analysis?.detected || {};
  return Number(detected.candles || 0) >= 18 && Number((detected.swingHighs || 0) + (detected.swingLows || 0)) >= 2;
}

export default function App() {
  const [screen, setScreen] = useState('analysis');
  const [settings, setSettings] = useState({
    captureSpeed: 250,
    darkMode: true,
    sourceId: null,
    sourceName: '',
    overlay: defaultOverlay
  });
  const [capturing, setCapturing] = useState(true);
  const [captureImage, setCaptureImage] = useState('');
  const [analysis, setAnalysis] = useState(defaultAnalysis);
  const [runtime, setRuntime] = useState(defaultRuntime);
  const [history, setHistory] = useState([]);
  const [notes, setNotes] = useState('');
  const [replay, setReplay] = useState(null);
  const [error, setError] = useState('');

  const timerRef = useRef(null);
  const lastHashRef = useRef(null);
  const lastAnalysisAtRef = useRef(0);
  const staleRef = useRef(0);
  const failuresRef = useRef(0);
  const frameTimesRef = useRef([]);
  const ocrTickRef = useRef(0);
  const sourceRef = useRef(null);
  const chartRegionRef = useRef(null);
  const analysisRef = useRef(defaultAnalysis);
  const runtimeRef = useRef(defaultRuntime);

  const electronReady = Boolean(desktop);
  const currentAnalysis = replay?.analysis || analysis;
  const currentImage = replay?.screenshotDataUrl || captureImage;

  useEffect(() => {
    analysisRef.current = analysis;
  }, [analysis]);

  useEffect(() => {
    runtimeRef.current = runtime;
  }, [runtime]);

  useEffect(() => {
    if (!electronReady) return;
    Promise.all([desktop.getConfig(), desktop.listHistory()])
      .then(([config, rows]) => {
        const normalized = {
          ...config,
          sourceId: null,
          sourceName: '',
          overlay: { ...defaultOverlay, ...(config.overlay || {}) }
        };
        setSettings(normalized);
        setHistory(rows);
        desktop.updateOverlaySettings?.(normalized.overlay).catch(() => {});
      })
      .catch((err) => setError(err.message || 'Unable to load desktop settings.'));
  }, [electronReady]);

  useEffect(() => {
    if (!electronReady || !capturing) {
      setRuntime((current) => ({
        ...current,
        live: false,
        captureStatus: capturing ? 'Waiting for Olymp Trade' : 'Paused',
        aiStatus: capturing ? 'Auto-detecting Olymp Trade' : 'Paused'
      }));
      return undefined;
    }

    let active = true;
    const targetDelay = Math.max(200, Math.min(1000, Number(settings.captureSpeed || 250)));

    async function locateOlympTrade() {
      const sources = await desktop.listSources();
      const olympSource = findOlympTradeSource(sources);
      if (!olympSource) {
        sourceRef.current = null;
        chartRegionRef.current = null;
        lastHashRef.current = null;
        lastAnalysisAtRef.current = 0;
        staleRef.current = 0;
        setCaptureImage('');
        setAnalysis(defaultAnalysis);
        setRuntime((current) => ({
          ...current,
          live: false,
          fps: 0,
          captureStatus: 'Waiting for Olymp Trade',
          aiStatus: 'Open Olymp Trade to begin',
          chartStatus: 'Not locked',
        }));
        desktop.updateOverlay({ ...defaultAnalysis, live: false, captureStatus: 'Waiting for Olymp Trade' }).catch(() => {});
        return null;
      }

      if (sourceRef.current?.id !== olympSource.id) {
        sourceRef.current = olympSource;
        chartRegionRef.current = null;
        lastHashRef.current = null;
        lastAnalysisAtRef.current = 0;
        staleRef.current = 0;
        setSettings((current) => ({
          ...current,
          sourceId: olympSource.id,
          sourceName: olympSource.name,
        }));
      }
      return olympSource;
    }

    async function run() {
      if (!active) return;
      const started = performance.now();

      try {
        if (!sourceRef.current || !chartRegionRef.current) {
          setRuntime((current) => ({
            ...current,
            captureStatus: sourceRef.current ? 'Olymp Trade found' : 'Scanning Olymp Trade',
            aiStatus: 'Locating chart',
            live: false
          }));
        }

        const source = sourceRef.current || await locateOlympTrade();
        if (!source) return;

        const frame = await withTimeout(
          desktop.captureFrame(source.id),
          2200,
          'Olymp Trade capture timed out. Reconnecting automatically...'
        );
        const fullFrame = await withTimeout(
          readFullFrame(frame.image),
          1200,
          'Olymp Trade frame processing timed out. Retrying...'
        );

        const currentRegion = chartRegionRef.current;
        const shouldRelocate =
          !currentRegion ||
          currentRegion.frameWidth !== fullFrame.width ||
          currentRegion.frameHeight !== fullFrame.height;
        const detectedRegion = shouldRelocate
          ? detectOlympChartRegion(fullFrame.imageData, fullFrame.width, fullFrame.height)
          : currentRegion;

        if (!detectedRegion) {
          chartRegionRef.current = null;
          lastHashRef.current = null;
          setCaptureImage(frame.image);
          setRuntime((current) => ({
            ...current,
            live: false,
            captureStatus: 'Olymp Trade found',
            aiStatus: 'Waiting for visible candlestick chart',
          chartStatus: 'Chart not visible',
            processingTime: round(performance.now() - started)
          }));
          desktop.updateOverlay({ ...analysisRef.current, live: false, captureStatus: 'Chart not visible' }).catch(() => {});
          return;
        }

        chartRegionRef.current = {
          ...detectedRegion,
          frameWidth: fullFrame.width,
          frameHeight: fullFrame.height
        };

        const cropped = cropCanvas(fullFrame, detectedRegion);
        const now = Date.now();
        frameTimesRef.current = [...frameTimesRef.current.filter((time) => now - time < 1000), now];
        const fps = frameTimesRef.current.length;
        const isSameFrame = cropped.hash === lastHashRef.current;
        const shouldAnalyze = !isSameFrame || now - lastAnalysisAtRef.current >= 1000;

        if (!shouldAnalyze) {
          staleRef.current += 1;
          const status = {
            live: true,
            fps,
            processingTime: round(performance.now() - started),
            lastUpdated: new Date(now).toISOString(),
            captureStatus: 'LIVE',
            aiStatus: 'Capturing; chart unchanged',
            chartStatus: 'Chart active',
            staleFrames: staleRef.current,
            failures: failuresRef.current
          };
          setCaptureImage(cropped.dataUrl);
          setRuntime((current) => ({ ...current, ...status }));
          desktop.updateOverlay({ ...analysisRef.current, ...status }).catch(() => {});
          return;
        }

        staleRef.current = isSameFrame ? staleRef.current + 1 : 0;
        failuresRef.current = 0;
        lastHashRef.current = cropped.hash;
        lastAnalysisAtRef.current = now;
        ocrTickRef.current += 1;

        let ocrStatus = runtimeRef.current.ocrStatus;
        if (ocrTickRef.current === 1 || ocrTickRef.current % 8 === 0) {
          const ocrResult = await withTimeout(
            inspectVisibleText(cropped.dataUrl),
            1800,
            'OCR retrying'
          ).catch((ocrError) => ({ status: 'OCR retrying', message: ocrError.message }));
          ocrStatus = ocrResult.status;
        }

        const nextAnalysis = analyzeChartImage(cropped.imageData, cropped.width, cropped.height);
        if (!hasUsableChartSignal(nextAnalysis)) {
          const status = {
            live: true,
            fps,
            processingTime: round(performance.now() - started),
            lastUpdated: new Date(now).toISOString(),
            captureStatus: 'LIVE',
            aiStatus: 'Waiting for stable candles',
            ocrStatus,
            chartStatus: 'Chart loading / no candles',
            staleFrames: staleRef.current,
            failures: 0
          };
          setCaptureImage(cropped.dataUrl);
          setRuntime((current) => ({ ...current, ...status }));
          desktop.updateOverlay({ ...analysisRef.current, ...status }).catch(() => {});
          setError('');
          return;
        }

        const status = {
          live: true,
          fps,
          processingTime: round(performance.now() - started),
          lastUpdated: new Date(now).toISOString(),
          captureStatus: 'LIVE',
          aiStatus: isSameFrame ? 'Refreshed analysis every second' : 'Analyzed fresh Olymp Trade chart',
          ocrStatus,
          chartStatus: 'Chart active',
          staleFrames: 0,
          failures: 0
        };

        setCaptureImage(cropped.dataUrl);
        setAnalysis(nextAnalysis);
        setRuntime((current) => ({ ...current, ...status }));
        desktop.updateOverlay({ ...nextAnalysis, ...status }).catch(() => {});
        setError('');
      } catch (err) {
        failuresRef.current += 1;
        const message = err.message || 'Olymp Trade capture failed. Retrying automatically...';
        if (failuresRef.current % 2 === 0) {
          sourceRef.current = null;
          chartRegionRef.current = null;
          lastHashRef.current = null;
          lastAnalysisAtRef.current = 0;
        }
        setRuntime((current) => ({
          ...current,
          live: false,
          captureStatus: 'Recovering',
          aiStatus: 'Retrying Olymp Trade detection',
          chartStatus: 'Finding chart',
          processingTime: round(performance.now() - started),
          failures: failuresRef.current
        }));
        setError(message);
      } finally {
        if (active) {
          const elapsed = performance.now() - started;
          timerRef.current = setTimeout(run, Math.max(120, targetDelay - elapsed));
        }
      }
    }

    run();
    return () => {
      active = false;
      clearTimeout(timerRef.current);
    };
  }, [electronReady, capturing, settings.captureSpeed]);

  const statusCards = useMemo(() => [
    ['Capture FPS', runtime.fps, Gauge],
    ['Processing', `${runtime.processingTime}ms`, Activity],
    ['Last Updated', formatTime(runtime.lastUpdated), Clock3],
    ['OCR Status', runtime.ocrStatus, Crosshair],
    ['AI Status', runtime.aiStatus, ShieldAlert],
    ['Capture Status', runtime.captureStatus, Wifi]
  ], [runtime]);

  async function saveSnapshot() {
    if (!captureImage) {
      setError('No Olymp Trade chart image is available yet.');
      return;
    }
    const saved = await desktop.saveHistory({ image: captureImage, analysis, notes });
    setHistory([saved, ...history]);
    setNotes('');
  }

  async function updateSetting(key, value) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await desktop.setConfig(next);
  }

  async function updateOverlaySetting(key, value) {
    const overlay = { ...defaultOverlay, ...(settings.overlay || {}), [key]: value };
    const next = { ...settings, overlay };
    setSettings(next);
    await desktop.setConfig(next);
    await desktop.updateOverlaySettings?.(overlay);
  }

  async function showOverlay(interactive = false) {
    const overlay = { ...defaultOverlay, ...(settings.overlay || {}), clickThrough: !interactive };
    const next = { ...settings, overlay };
    setSettings(next);
    await desktop.setConfig(next);
    await desktop.updateOverlaySettings?.(overlay);
    await desktop.showOverlay();
  }

  if (!electronReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-ink p-6 text-slate-200">
        <section className="glass max-w-xl rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-black text-white">Desktop app required</h1>
          <p className="mt-3 text-slate-400">Launch DhanLabh AI Chart Assistant as a Windows desktop app to use Olymp Trade screen analysis.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink p-4 text-slate-200">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-white">Olymp Trade AI Chart Assistant</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${runtime.live ? 'bg-mint text-ink' : 'bg-white/10 text-slate-300'}`}>
              {runtime.live ? 'LIVE' : runtime.captureStatus}
            </span>
          </div>
          <p className="text-xs text-slate-500">{settings.sourceName || 'Waiting for Olymp Trade'} - Auto chart detection</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCapturing((value) => !value)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${capturing ? 'bg-danger text-white' : 'bg-mint text-ink'}`}>
            {capturing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />} {capturing ? 'Pause' : 'Resume'}
          </button>
          <button onClick={() => showOverlay(false)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white"><Maximize2 className="h-4 w-4" /> Overlay</button>
          <button onClick={() => showOverlay(true)} className="inline-flex items-center gap-2 rounded-xl border border-amber/20 bg-amber/10 px-4 py-2 text-sm font-bold text-amber"><Move className="h-4 w-4" /> Move Overlay</button>
          <button onClick={() => setScreen('settings')} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white"><Settings className="h-4 w-4" /> Settings</button>
          <button onClick={() => desktop.exit()} className="inline-flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/10 px-4 py-2 text-sm font-bold text-danger"><Power className="h-4 w-4" /> Exit</button>
        </div>
      </header>

      {error && <div className="mb-4 rounded-xl border border-amber/20 bg-amber/10 p-3 text-sm text-amber">{error}</div>}

      {screen === 'settings' ? (
        <SettingsScreen
          settings={settings}
          updateSetting={updateSetting}
          updateOverlaySetting={updateOverlaySetting}
          showOverlay={showOverlay}
          goBack={() => setScreen('analysis')}
        />
      ) : (
        <>
          <section className="mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {statusCards.map(([label, value, Icon]) => (
              <StatusTile key={label} label={label} value={value} Icon={Icon} live={runtime.live && label === 'Capture Status'} />
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_460px]">
            <div className="glass overflow-hidden rounded-2xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 p-3">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-aqua" />
                  <span className="text-sm font-bold text-white">Auto-detected Olymp Trade chart</span>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-slate-300">Automatic</div>
              </div>

              <div className="grid min-h-[560px] place-items-center bg-black p-3">
                {currentImage ? (
                  <img src={currentImage} alt="Detected Olymp Trade chart" className="max-h-[680px] max-w-full rounded-xl object-contain shadow-2xl" />
                ) : (
                  <div className="text-center">
                    <Monitor className="mx-auto h-12 w-12 text-aqua" />
                    <p className="mt-4 text-xl font-black text-white">Waiting for Olymp Trade</p>
                    <p className="mt-2 max-w-md text-sm text-slate-500">Open Olymp Trade and keep the candlestick chart visible. DhanLabh will lock onto the chart automatically.</p>
                  </div>
                )}
              </div>
            </div>

            <AnalysisPanel analysis={currentAnalysis} runtime={runtime} />
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_420px]">
            <div className="glass rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-black text-white"><History className="h-4 w-4 text-aqua" /> History and replay</h2>
                {replay && <button onClick={() => setReplay(null)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300"><X className="h-3 w-3" /> close replay</button>}
              </div>
              <div className="grid max-h-56 gap-2 overflow-auto md:grid-cols-2 xl:grid-cols-3">
                {history.map((item) => (
                  <button key={item.id} onClick={() => setReplay(item)} className="grid grid-cols-[72px_1fr] gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-left">
                    <img src={item.screenshotDataUrl} alt="Saved chart screenshot" className="h-14 w-20 rounded-lg object-cover" />
                    <div>
                      <p className="text-sm font-bold text-white">{item.pattern || 'Chart analysis'}</p>
                      <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
                      <p className="text-xs text-aqua">{item.trend} - {item.confidence}%</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-white"><StickyNote className="h-4 w-4 text-mint" /> Journal</h2>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add personal notes for this screenshot..." className="min-h-24 w-full rounded-xl border border-white/10 bg-panel p-3 text-sm text-white outline-none" />
              <button onClick={saveSnapshot} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-mint px-4 py-3 font-black text-ink"><Save className="h-4 w-4" /> Save screenshot and analysis</button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function StatusTile({ label, value, Icon, live }) {
  return (
    <div className={`rounded-xl border p-3 ${live ? 'border-mint/30 bg-mint/10' : 'border-white/10 bg-white/[0.035]'}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
        <Icon className={`h-4 w-4 ${live ? 'text-mint' : 'text-aqua'}`} />
      </div>
      <p className="truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function AnalysisPanel({ analysis, runtime }) {
  const rows = [
    ['Decision', analysis.decision || 'WAIT'],
    ['Trend', analysis.trend],
    ['Support', analysis.support],
    ['Resistance', analysis.resistance],
    ['Market Structure', analysis.marketStructure],
    ['Pattern Detected', analysis.pattern],
    ['Confidence Level', `${Math.round(analysis.confidence || 0)}%`],
    ['Risk Level', analysis.risk],
    ['Momentum', analysis.momentum]
  ];
  return (
    <aside className="glass rounded-2xl p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AI analysis</p>
          <h2 className={`mt-1 text-4xl font-black ${analysis.trend === 'Bullish' ? 'text-mint' : analysis.trend === 'Bearish' ? 'text-danger' : 'text-amber'}`}>{analysis.trend}</h2>
          <p className="mt-1 text-xs text-slate-500">{runtime.live ? 'Fresh Olymp Trade chart processed' : runtime.aiStatus}</p>
        </div>
        <div className="meter grid h-24 w-24 place-items-center rounded-full" style={{ '--value': `${(analysis.confidence || 0) * 3.6}deg` }}>
          <div className="grid h-[74%] w-[74%] place-items-center rounded-full bg-panel text-center">
            <p className="text-xl font-black text-white">{Math.round(analysis.confidence || 0)}%</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className={`rounded-xl border p-3 ${label.includes('Risk') || label === 'Decision' ? tone(value) : 'border-white/10 bg-white/[0.035]'}`}>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-1 break-words text-base font-black text-white">{value ?? '-'}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-4">
        <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Indicator summary</p>
        <div className="flex flex-wrap gap-2">
          {(analysis.indicatorAlignment?.length ? analysis.indicatorAlignment : ['Mixed / unclear']).map((item) => (
            <span key={item} className="rounded-full border border-aqua/20 bg-aqua/10 px-3 py-1 text-xs text-aqua">{item}</span>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-4">
        <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Why this analysis</p>
        <ul className="space-y-2 text-sm leading-relaxed text-slate-300">
          {(analysis.explanation || []).map((line) => <li key={line}>{line}</li>)}
        </ul>
      </div>
    </aside>
  );
}

function SettingsScreen({ settings, updateSetting, updateOverlaySetting, showOverlay, goBack }) {
  const overlay = { ...defaultOverlay, ...(settings.overlay || {}) };
  return (
    <section className="glass mx-auto max-w-2xl rounded-2xl p-6">
      <h2 className="text-2xl font-black text-white">Settings</h2>
      <div className="mt-5 grid gap-5">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-300">Capture speed: {settings.captureSpeed}ms</span>
          <input type="range" min="200" max="1000" step="50" value={settings.captureSpeed} onChange={(event) => updateSetting('captureSpeed', Number(event.target.value))} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-300">Overlay transparency: {Math.round(overlay.opacity * 100)}%</span>
          <input type="range" min="35" max="100" step="5" value={Math.round(overlay.opacity * 100)} onChange={(event) => updateOverlaySetting('opacity', Number(event.target.value) / 100)} />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <span className="font-bold text-white">Compact overlay mode</span>
          <input type="checkbox" checked={overlay.compact} onChange={(event) => updateOverlaySetting('compact', event.target.checked)} />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <span className="font-bold text-white">Overlay does not block chart</span>
          <input type="checkbox" checked={overlay.clickThrough} onChange={(event) => updateOverlaySetting('clickThrough', event.target.checked)} />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <span className="font-bold text-white">Dark mode</span>
          <input type="checkbox" checked={settings.darkMode} onChange={(event) => updateSetting('darkMode', event.target.checked)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={() => showOverlay(true)} className="rounded-xl border border-amber/20 bg-amber/10 px-4 py-3 font-bold text-amber">Move or resize overlay</button>
          <button onClick={() => showOverlay(false)} className="rounded-xl border border-mint/20 bg-mint/10 px-4 py-3 font-bold text-mint">Lock overlay over chart</button>
        </div>
        <button onClick={goBack} className="rounded-xl bg-aqua px-4 py-3 font-black text-ink">Back to analysis</button>
      </div>
    </section>
  );
}
