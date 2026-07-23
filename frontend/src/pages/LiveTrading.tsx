import React, { useState } from 'react';

export default function LiveTrading() {
  const [isRunning, setIsRunning] = useState(false);

  const handleToggleAnalysis = () => {
    setIsRunning(prev => !prev);
    if ((window as any).electronAPI?.toggleOverlay) {
      (window as any).electronAPI.toggleOverlay();
    }
  };

  return (
    <div style={{ padding: '32px', backgroundColor: '#080e17', minHeight: '100vh', color: '#ffffff', fontFamily: 'monospace, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#22c55e', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚡ Live Control Center
          </h1>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
            Real-time AI Candle, Pattern & Indicator Scanner for Olymp Trade
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', backgroundColor: isRunning ? 'rgba(6, 78, 59, 0.4)' : 'rgba(136, 19, 55, 0.4)', border: isRunning ? '1px solid #059669' : '1px solid #e11d48', color: isRunning ? '#34d399' : '#fb7185', fontWeight: 'bold' }}>
            {isRunning ? '● AI RUNNING' : '● AI STOPPED'}
          </span>
        </div>
      </div>

      {/* Control Card */}
      <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', letterSpacing: '1px' }}>ENGINE CONTROL</div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f8fafc', marginTop: '4px' }}>
              {isRunning ? 'ANALYSIS RUNNING' : 'ENGINE STANDBY'}
            </h2>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
              Analyzes candles, price patterns, S/R levels, and indicators from whatever active chart is visible on Olymp Trade.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleToggleAnalysis}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                border: 'none',
                backgroundColor: isRunning ? '#e11d48' : '#10b981',
                color: '#ffffff',
                boxShadow: isRunning ? '0 4px 14px rgba(225, 29, 72, 0.4)' : '0 4px 14px rgba(16, 185, 129, 0.4)'
              }}
            >
              {isRunning ? '⏹ Stop Analysis' : '▶ Start Analysis'}
            </button>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={cardStyle}>
          <div style={cardLabel}>AI ENGINE STATUS</div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: isRunning ? '#22c55e' : '#9ca3af', marginTop: '8px' }}>
            {isRunning ? 'RUNNING' : 'STOPPED'}
          </div>
          <div style={cardSubtext}>1000ms Vision Loop</div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabel}>ACTIVE PLATFORM</div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#22c55e', marginTop: '8px' }}>Olymp Trade</div>
          <div style={cardSubtext}>Exclusive High-Speed Bind</div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabel}>VISION MODE</div>
          <div style={{ fontSize: '16px', fontWeight: '900', color: '#f59e0b', marginTop: '8px' }}>AUTO-DETECT (ANY CHART)</div>
          <div style={cardSubtext}>Auto Chart & Candle Pattern Scan</div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabel}>OVERLAY WINDOW</div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: isRunning ? '#22c55e' : '#9ca3af', marginTop: '8px' }}>
            {isRunning ? 'ENABLED' : 'DISABLED'}
          </div>
          <div style={cardSubtext}>Floating Trading UI</div>
        </div>
      </div>
    </div>
  );
}

const cardStyle = { backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' };
const cardLabel = { fontSize: '10px', fontWeight: 'bold' as const, color: '#64748b', letterSpacing: '0.5px' };
const cardSubtext = { fontSize: '11px', color: '#9ca3af', marginTop: '4px' };