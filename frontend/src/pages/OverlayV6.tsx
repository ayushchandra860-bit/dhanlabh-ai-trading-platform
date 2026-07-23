import React, { useState } from 'react';

export default function OverlayV6() {
  const [signal] = useState<'BUY' | 'SELL' | 'WAIT'>('BUY');
  const [confidence] = useState(91);

  return (
    <div className="w-screen h-screen bg-transparent pointer-events-none select-none p-4 flex flex-col justify-between overflow-hidden font-mono">
      {/* Top Status Header */}
      <div className="flex items-center justify-between pointer-events-auto bg-black/85 backdrop-blur-md border border-gray-800 rounded-lg px-4 py-2 text-xs text-white w-max gap-4 shadow-xl">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          AI Connected
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          OCR Active
        </span>
        <span className="flex items-center gap-2 text-emerald-400 font-bold">
          Overlay Active
        </span>
      </div>

      {/* Center Layout Container */}
      <div className="flex justify-between items-start my-auto w-full px-2">
        {/* Left Signal Card */}
        <div className="pointer-events-auto bg-black/90 backdrop-blur-md border border-emerald-500/40 rounded-xl p-5 text-white w-72 shadow-2xl">
          <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">AI Signal</div>
          <div className={`text-4xl font-extrabold mb-3 ${signal === 'BUY' ? 'text-emerald-400' : signal === 'SELL' ? 'text-rose-500' : 'text-amber-400'}`}>
            {signal}
          </div>

          <div className="space-y-2 border-t border-gray-800 pt-3 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Confidence:</span>
              <span className="text-emerald-400 font-bold">{confidence}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Risk Level:</span>
              <span className="text-emerald-400 font-bold">LOW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Expiry Time:</span>
              <span className="text-amber-400 font-bold">1 MINUTE</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-800/50">
              <span className="text-gray-400">Entry Status:</span>
              <span className="text-emerald-400 font-bold">ENTRY NOW (YES)</span>
            </div>
          </div>
        </div>

        {/* Right Intel Card */}
        <div className="pointer-events-auto bg-black/90 backdrop-blur-md border border-gray-800 rounded-xl p-5 text-white w-80 shadow-2xl text-xs space-y-4">
          <div>
            <div className="text-amber-400 font-bold uppercase tracking-wider mb-2">Support & Resistance</div>
            <div className="flex justify-between py-1 border-b border-gray-800">
              <span className="text-gray-400">Nearest Support:</span>
              <span className="font-bold">1.08530 <span className="text-emerald-400 text-[10px]">(18 pts)</span></span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-800">
              <span className="text-gray-400">Nearest Resistance:</span>
              <span className="font-bold">1.08726 <span className="text-rose-400 text-[10px]">(46 pts)</span></span>
            </div>
          </div>

          <div>
            <div className="text-emerald-400 font-bold uppercase tracking-wider mb-2">AI Checklist</div>
            <div className="space-y-1 text-[11px]">
              <div className="text-emerald-400">✓ Support Safe</div>
              <div className="text-emerald-400">✓ Resistance Clearance OK</div>
              <div className="text-emerald-400">✓ Candle Rejection Confirmed</div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-800 flex justify-between items-center">
            <span className="text-gray-400 font-bold">Trade Allowed:</span>
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-2 py-0.5 rounded font-bold">YES</span>
          </div>
        </div>
      </div>

      {/* Bottom History Bar */}
      <div className="pointer-events-auto bg-black/90 backdrop-blur-md border border-gray-800 rounded-lg p-3 text-white text-xs flex justify-between items-center w-full max-w-2xl mx-auto shadow-2xl">
        <div className="flex gap-3 items-center">
          <span className="text-gray-400 text-[11px] font-bold">RECENT:</span>
          <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800">BUY ✓</span>
          <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800">BUY ✓</span>
          <span className="bg-amber-950 text-amber-400 px-2 py-0.5 rounded border border-amber-800">WAIT --</span>
        </div>
        <div className="text-gray-400 text-[11px]">
          Reason: <span className="text-gray-200">Strong bounce from lower support zone</span>
        </div>
      </div>
    </div>
  );
}