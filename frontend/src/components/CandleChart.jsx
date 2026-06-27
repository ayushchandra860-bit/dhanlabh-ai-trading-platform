import React, { useEffect, useRef, useState } from 'react';
import { money } from '../lib/format.js';

function ema(values, period) {
  const k = 2 / (period + 1);
  let previous = values[0] || 0;
  return values.map((value, index) => {
    previous = index === 0 ? value : value * k + previous * (1 - k);
    return previous;
  });
}

function bollinger(values, period = 20, multiplier = 2) {
  return values.map((_, index) => {
    if (index + 1 < period) return null;
    const window = values.slice(index + 1 - period, index + 1);
    const mean = window.reduce((sum, value) => sum + value, 0) / window.length;
    const dev = Math.sqrt(window.reduce((sum, value) => sum + (value - mean) ** 2, 0) / window.length);
    return { upper: mean + dev * multiplier, lower: mean - dev * multiplier, middle: mean };
  });
}

function vwap(candles) {
  let pv = 0;
  let volume = 0;
  return candles.map((candle) => {
    const typical = (candle.high + candle.low + candle.close) / 3;
    pv += typical * (candle.volume || 1);
    volume += candle.volume || 1;
    return pv / volume;
  });
}

function labelTime(time) {
  return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function CandleChart({ candles = [], direction }) {
  const canvasRef = useRef(null);
  const geometryRef = useRef(null);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !candles.length) return undefined;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      const dpr = window.devicePixelRatio || 1;
      const height = 460;
      canvas.width = rect.width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, height);

      const width = rect.width;
      const top = 24;
      const left = 18;
      const right = 82;
      const bottom = 28;
      const volumeHeight = 74;
      const priceHeight = height - top - bottom - volumeHeight - 18;
      const volumeTop = top + priceHeight + 18;
      const chart = candles.slice(-150);
      const closes = chart.map((candle) => candle.close);
      const ema20 = ema(closes, 20);
      const ema50 = ema(closes, 50);
      const bands = bollinger(closes, 20, 2);
      const vwapLine = vwap(chart);
      const rawHigh = Math.max(...chart.flatMap((candle, index) => [candle.high, bands[index]?.upper ?? candle.high]));
      const rawLow = Math.min(...chart.flatMap((candle, index) => [candle.low, bands[index]?.lower ?? candle.low]));
      const padding = (rawHigh - rawLow || rawHigh * 0.01) * 0.12;
      const high = rawHigh + padding;
      const low = rawLow - padding;
      const plotWidth = width - left - right;
      const step = plotWidth / Math.max(chart.length, 1);
      const candleWidth = Math.max(3, Math.min(11, step * 0.58));
      const x = (index) => left + index * step + step / 2;
      const y = (price) => top + ((high - price) / (high - low || 1)) * priceHeight;
      const volumeMax = Math.max(...chart.map((candle) => candle.volume || 1));
      const volumeY = (volume) => volumeTop + volumeHeight - (volume / volumeMax) * volumeHeight;

      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, '#0d1528');
      bg.addColorStop(1, '#070b15');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(148,163,184,.12)';
      ctx.fillStyle = 'rgba(148,163,184,.72)';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i += 1) {
        const gy = top + (priceHeight / 5) * i;
        const price = high - ((high - low) / 5) * i;
        ctx.beginPath();
        ctx.moveTo(left, gy);
        ctx.lineTo(width - right + 14, gy);
        ctx.stroke();
        ctx.fillText(money(price), width - right + 22, gy + 4);
      }

      for (let i = 0; i <= 5; i += 1) {
        const index = Math.min(chart.length - 1, Math.round((chart.length - 1) * (i / 5)));
        const gx = x(index);
        ctx.beginPath();
        ctx.moveTo(gx, top);
        ctx.lineTo(gx, volumeTop + volumeHeight);
        ctx.stroke();
        ctx.fillText(labelTime(chart[index]?.time), Math.max(left, gx - 24), height - 8);
      }

      const drawLine = (values, color, widthLine = 1.6) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = widthLine;
        ctx.beginPath();
        values.forEach((value, index) => {
          const px = x(index);
          const py = y(value);
          if (index === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      };

      const validBands = bands.map((band, index) => ({ band, index })).filter((item) => item.band);
      if (validBands.length > 2) {
        ctx.fillStyle = 'rgba(25,211,218,.07)';
        ctx.beginPath();
        validBands.forEach(({ band, index }, i) => {
          const px = x(index);
          const py = y(band.upper);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        [...validBands].reverse().forEach(({ band, index }) => ctx.lineTo(x(index), y(band.lower)));
        ctx.closePath();
        ctx.fill();
      }

      chart.forEach((candle, index) => {
        const px = x(index);
        const up = candle.close >= candle.open;
        ctx.fillStyle = up ? 'rgba(54,243,154,.22)' : 'rgba(255,84,112,.2)';
        ctx.fillRect(px - candleWidth / 2, volumeY(candle.volume || 1), candleWidth, volumeTop + volumeHeight - volumeY(candle.volume || 1));
        ctx.strokeStyle = up ? '#36f39a' : '#ff5470';
        ctx.fillStyle = up ? '#36f39a' : '#ff5470';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px, y(candle.high));
        ctx.lineTo(px, y(candle.low));
        ctx.stroke();
        const bodyTop = Math.min(y(candle.open), y(candle.close));
        const bodyHeight = Math.max(2, Math.abs(y(candle.open) - y(candle.close)));
        ctx.fillRect(px - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      });

      drawLine(ema20, '#ffcf5c', 1.4);
      drawLine(ema50, '#19d3da', 1.4);
      drawLine(vwapLine, 'rgba(255,255,255,.65)', 1.2);

      const lastCandle = chart.at(-1);
      const lastY = y(lastCandle.close);
      ctx.strokeStyle = direction === 'BUY' ? 'rgba(54,243,154,.72)' : direction === 'SELL' ? 'rgba(255,84,112,.72)' : 'rgba(255,207,92,.72)';
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(left, lastY);
      ctx.lineTo(width - right + 14, lastY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillRect(width - right + 18, lastY - 12, right - 24, 24);
      ctx.fillStyle = '#050816';
      ctx.font = 'bold 11px Inter, system-ui, sans-serif';
      ctx.fillText(money(lastCandle.close), width - right + 24, lastY + 4);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillText('EMA 20', left, 16);
      ctx.fillStyle = '#ffcf5c';
      ctx.fillRect(left + 48, 10, 18, 3);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('EMA 50', left + 80, 16);
      ctx.fillStyle = '#19d3da';
      ctx.fillRect(left + 128, 10, 18, 3);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('VWAP', left + 160, 16);
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      ctx.fillRect(left + 200, 10, 18, 3);

      if (hover?.index >= 0 && hover.index < chart.length) {
        const index = hover.index;
        const candle = chart[index];
        const px = x(index);
        const py = y(candle.close);
        ctx.strokeStyle = 'rgba(255,255,255,.35)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(px, top);
        ctx.lineTo(px, volumeTop + volumeHeight);
        ctx.moveTo(left, py);
        ctx.lineTo(width - right + 14, py);
        ctx.stroke();
        ctx.setLineDash([]);
        const boxX = Math.min(width - 240, Math.max(left + 6, px + 12));
        const boxY = Math.max(top + 8, py - 58);
        ctx.fillStyle = 'rgba(5,8,22,.92)';
        ctx.strokeStyle = 'rgba(255,255,255,.14)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, 218, 94, 14);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 12px Inter, system-ui, sans-serif';
        ctx.fillText(labelTime(candle.time), boxX + 12, boxY + 20);
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`O ${money(candle.open)}  H ${money(candle.high)}`, boxX + 12, boxY + 42);
        ctx.fillText(`L ${money(candle.low)}  C ${money(candle.close)}`, boxX + 12, boxY + 62);
        ctx.fillText(`Vol ${Math.round(candle.volume || 0).toLocaleString()}`, boxX + 12, boxY + 82);
      }

      geometryRef.current = { left, right, width, chart, step };
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [candles, direction, hover]);

  function handleMove(event) {
    const geometry = geometryRef.current;
    if (!geometry) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const index = Math.round((localX - geometry.left - geometry.step / 2) / geometry.step);
    setHover({ index: Math.max(0, Math.min(geometry.chart.length - 1, index)) });
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
        <div>
          <p className="text-sm font-bold text-white">Advanced candle chart</p>
          <p className="text-xs text-slate-500">Candles · volume · EMA 20/50 · VWAP · Bollinger bands</p>
        </div>
        <p className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-400">Hover for OHLC</p>
      </div>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        className="h-[460px] w-full cursor-crosshair"
      />
    </section>
  );
}
