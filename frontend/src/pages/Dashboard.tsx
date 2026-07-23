import React from 'react';

export default function Dashboard() {
  return (
    <div style={{ padding: '24px', backgroundColor: '#080e17', minHeight: '100vh', color: '#ffffff', fontFamily: 'sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#22c55e', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            📊 DASHBOARD OVERVIEW
          </h1>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>DhanLabh AI V2 / MARS PRO System Analytics</p>
        </div>

        <div style={{ backgroundColor: 'rgba(6, 78, 59, 0.4)', border: '1px solid #059669', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34d399' }}></span>
          SYSTEM ONLINE
        </div>
      </div>

      {/* Grid Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        
        <div style={cardStyle}>
          <div style={cardLabel}>AI ACCURACY (WIN RATE)</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#22c55e', marginTop: '8px' }}>88.4%</div>
          <div style={cardSubtext}>Based on last 50 signals</div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabel}>ACTIVE BROKER</div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff', marginTop: '8px' }}>Olymp Trade</div>
          <div style={{ ...cardSubtext, color: '#34d399' }}>Exclusive High-Speed Bind</div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabel}>SCANNING ASSET</div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#f59e0b', marginTop: '8px' }}>AUTO-DETECT</div>
          <div style={cardSubtext}>Vision Engine reads live open chart</div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabel}>ENGINE LATENCY</div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: '#38bdf8', marginTop: '8px' }}>1000ms</div>
          <div style={cardSubtext}>1 FPS Vision Capture</div>
        </div>

      </div>

      {/* Module Health Box */}
      <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid #1e293b', padding: '20px', borderRadius: '12px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '16px' }}>SYSTEM MODULES HEALTH</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
          <div style={rowStyle}><span>OCR Vision Engine</span><strong style={{ color: '#22c55e' }}>READY</strong></div>
          <div style={rowStyle}><span>IPC Bridge Channel</span><strong style={{ color: '#22c55e' }}>ACTIVE</strong></div>
          <div style={rowStyle}><span>Transparent Overlay Subsystem</span><strong style={{ color: '#22c55e' }}>STANDBY</strong></div>
          <div style={{ ...rowStyle, borderBottom: 'none' }}><span>Technical Analysis AI Pipeline</span><strong style={{ color: '#22c55e' }}>ONLINE</strong></div>
        </div>
      </div>

    </div>
  );
}

const cardStyle = { backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid #1e293b', padding: '16px', borderRadius: '12px' };
const cardLabel = { fontSize: '10px', fontWeight: 'bold' as const, color: '#64748b', letterSpacing: '0.5px' };
const cardSubtext = { fontSize: '11px', color: '#9ca3af', marginTop: '4px' };
const rowStyle = { display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#9ca3af' };