import React from 'react';
import { AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { badgeTone, money, pct } from '../lib/format.js';

export function SignalCard({ analysis }) {
  if (!analysis) return <div className="glass rounded-3xl p-6 text-slate-400">Loading AI market analysis...</div>;
  return (
    <section className="glass rounded-3xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Final recommendation</p>
          <div className="mt-2 flex items-center gap-3">
            <span className={`rounded-2xl border px-5 py-2 text-3xl font-black ${badgeTone(analysis.direction)}`}>{analysis.direction}</span>
            <span className={`rounded-full border px-3 py-1 text-sm ${badgeTone(analysis.signalGrade)}`}>Grade {analysis.signalGrade}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Last price</p>
          <p className="text-2xl font-semibold text-white">{money(analysis.lastPrice)}</p>
          <p className="text-xs text-slate-500">{new Date(analysis.generatedAt).toLocaleTimeString()} - {analysis.dataSource}</p>
        </div>
      </div>

      {analysis.dataWarning && (
        <div className="mt-5 flex gap-3 rounded-2xl border border-danger/20 bg-danger/10 p-4 text-danger">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{analysis.dataWarning}</p>
        </div>
      )}

      {analysis.noTradeReason && (
        <div className="mt-5 flex gap-3 rounded-2xl border border-amber/20 bg-amber/10 p-4 text-amber">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm">No-trade detector: {analysis.noTradeReason}</p>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Trade score" value={pct(analysis.tradeScore ?? analysis.confidence)} tone="text-aqua" />
        <Metric label="Trade grade" value={analysis.tradeGrade || analysis.signalGrade} tone="text-mint" />
        <Metric label="Bullish probability" value={pct(analysis.bullishProbability)} tone="text-mint" />
        <Metric label="Bearish probability" value={pct(analysis.bearishProbability)} tone="text-danger" />
        <Metric label="Confidence" value={pct(analysis.confidence)} tone="text-aqua" />
        <Metric label="Risk level" value={analysis.riskLevel} tone={analysis.riskLevel === 'High' ? 'text-danger' : 'text-mint'} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Approval" value={analysis.tradeApproval?.answer || 'NO'} tone={analysis.tradeApproval?.approved ? 'text-mint' : 'text-amber'} />
        <Metric label="Pattern memory" value={analysis.patternMemory?.historicalSimilarity ? pct(analysis.patternMemory.historicalSimilarity) : 'No data'} tone="text-aqua" />
        <Metric label="Calibration" value={`${analysis.confidenceCalibration?.adjustment ?? 0}%`} tone={(analysis.confidenceCalibration?.adjustment ?? 0) >= 0 ? 'text-mint' : 'text-danger'} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Tick direction" value={analysis.tickDirection || 'flat'} tone={analysis.tickDirection === 'up' ? 'text-mint' : analysis.tickDirection === 'down' ? 'text-danger' : 'text-slate-300'} />
        <Metric label="Price change" value={money(analysis.priceChange || 0)} tone={(analysis.priceChange || 0) >= 0 ? 'text-mint' : 'text-danger'} />
        <Metric label="Latency" value={`${analysis.analysisLatencyMs ?? 0}ms`} tone="text-aqua" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Data quality" value={analysis.dataIntegrity?.status || 'unknown'} tone={analysis.lowConfidenceData ? 'text-danger' : 'text-mint'} />
        <Metric label="Providers" value={analysis.dataIntegrity?.providerCount ?? 0} tone="text-aqua" />
        <Metric label="Max diff" value={`${analysis.dataIntegrity?.maxDifferencePercent ?? 0}%`} tone={analysis.lowConfidenceData ? 'text-danger' : 'text-mint'} />
      </div>

      {analysis.providerAudit?.length > 0 && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="mb-3 text-xs uppercase tracking-wider text-slate-500">Provider comparison</p>
          <div className="grid gap-2">
            {analysis.providerAudit.slice(0, 4).map((provider, index) => (
              <div key={`${provider.provider}-${index}`} className="flex items-center justify-between gap-3 text-xs">
                <span className={provider.ok ? 'text-slate-300' : 'text-danger'}>{provider.label || provider.provider}</span>
                <span className="text-slate-500">{provider.ok ? money(provider.latestPrice) : provider.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[190px_1fr]">
        <div className="meter grid aspect-square place-items-center rounded-full" style={{ '--value': `${analysis.confidence * 3.6}deg` }}>
          <div className="grid h-[76%] w-[76%] place-items-center rounded-full bg-panel text-center">
            <ShieldCheck className="mx-auto mb-2 h-6 w-6 text-aqua" />
            <p className="text-3xl font-black">{pct(analysis.confidence)}</p>
            <p className="text-xs text-slate-500">confidence</p>
          </div>
        </div>
        <div>
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Zap className="h-4 w-4 text-aqua" /> Top AI factors</p>
          <div className="grid gap-2">
            {analysis.topFactors?.slice(0, 6).map((factor, index) => (
              <div key={`${factor.reason}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <span className="text-slate-500">{factor.engine}: </span>{factor.reason}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
