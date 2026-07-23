import React, { useState, useEffect } from 'react';

export default function OverlayV6() {
  const [data, setData] = useState<any>({
    signal: 'BUY',
    confidence: 91,
    tradeScore: 94,
    riskLevel: 'LOW',
    expiry: '1 MINUTE',
    entryNow: true,
    support: '1.08530',
    supportPts: 18,
    supportStars: 3,
    resistance: '1.08726',
    resistancePts: 46,
    resistanceStars: 4,
    toSupportPts: 18,
    toResistancePts: 46,
    whyTake: [
      'Resistance far',
      'Support holding strong',
      'Liquidity sweep completed',
      'Bullish rejection confirmed',
      'Risk to reward is favorable'
    ],
    whyNotTake: [
      'No major warnings',
      'All conditions favorable'
    ],
    danger: [
      'None',
      'No nearby strong resistance',
      'No support breakdown'
    ],
    checklist: {
      supportSafe: true,
      resistanceSafe: true,
      liquidityConfirmed: true,
      candleConfirmed: true,
      riskAcceptable: true,
      tradeAllowed: true
    },
    recentSignals: [
      { time: '09:05', action: 'BUY', success: true },
      { time: '09:00', action: 'BUY', success: true },
      { time: '08:55', action: 'WAIT', success: null },
      { time: '08:50', action: 'SELL', success: false },
      { time: '08:45', action: 'BUY', success: true }
    ],
    reasons: [
      'Support 18 pts below',
      'Resistance 46 pts above',
      'Liquidity sweep done',
      'Strong bullish rejection',
      'Good risk to reward'
    ],
    lastTick: 'LIVE'
  });

  // Card Positions
  const [posLeft, setPosLeft] = useState({ x: 25, y: 70 });
  const [posRight, setPosRight] = useState({ x: window.innerWidth - 330, y: 70 });
  const [posBottom, setPosBottom] = useState({ x: 250, y: window.innerHeight - 150 });

  // Live Data Feed IPC
  useEffect(() => {
    if ((window as any).electronAPI?.onSignalUpdate) {
      const cleanup = (window as any).electronAPI.onSignalUpdate((updated: any) => {
        if (updated) setData((prev: any) => ({ ...prev, ...updated }));
      });
      return () => { if (typeof cleanup === 'function') cleanup(); };
    }
  }, []);

  // Mouse Capture IPC
  const handleCardMouseEnter = () => {
    if ((window as any).electronAPI?.setIgnoreMouse) {
      (window as any).electronAPI.setIgnoreMouse(false);
    }
  };

  const handleBackgroundMouseEnter = () => {
    if ((window as any).electronAPI?.setIgnoreMouse) {
      (window as any).electronAPI.setIgnoreMouse(true);
    }
  };

  // Fixed 1:1 Smooth Drag
  const startDragging = (
    currentPos: { x: number; y: number },
    setter: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  ) => {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const initialX = currentPos.x;
      const initialY = currentPos.y;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startMouseX;
        const deltaY = moveEvent.clientY - startMouseY;
        setter({ x: initialX + deltaX, y: initialY + deltaY });
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };
  };

  return (
    <div
      onMouseEnter={handleBackgroundMouseEnter}
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: 'transparent',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
        fontFamily: 'Consolas, Monaco, monospace, sans-serif',
        color: '#ffffff'
      }}
    >
      {/* TOP BADGES */}
      <div 
        onMouseEnter={handleCardMouseEnter}
        style={{ position: 'absolute', top: '14px', left: '210px', display: 'flex', gap: '8px', pointerEvents: 'auto' }}
      >
        <span style={badgeStyle}><span style={dotGreenStyle}></span> AI Connected</span>
        <span style={badgeStyle}><span style={dotGreenStyle}></span> OCR Active</span>
        <span style={badgeStyle}><span style={dotGreenStyle}></span> Overlay ON</span>
      </div>

      {/* LEFT PANEL: AI SIGNAL */}
      <div
        onMouseEnter={handleCardMouseEnter}
        style={{
          position: 'absolute',
          left: `${posLeft.x}px`,
          top: `${posLeft.y}px`,
          width: '230px',
          backgroundColor: 'rgba(6, 12, 20, 0.95)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '10px',
          padding: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.85)',
          resize: 'both',
          overflow: 'auto',
          pointerEvents: 'auto'
        }}
      >
        <div onMouseDown={startDragging(posLeft, setPosLeft)} style={dragHandleStyle}>
          ⠿ DRAG SIGNAL PANEL
        </div>

        <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 'bold' }}>AI SIGNAL</div>
        <div style={{ fontSize: '42px', fontWeight: '900', color: data.signal === 'BUY' ? '#22c55e' : data.signal === 'SELL' ? '#f43f5e' : '#f59e0b', margin: '0 0 6px 0', letterSpacing: '1px' }}>
          {data.signal}
        </div>

        <div style={metricRow}><span style={labelStyle}>CONFIDENCE</span><span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '13px' }}>{data.confidence}%</span></div>
        <div style={metricRow}><span style={labelStyle}>TRADE SCORE</span><span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '13px' }}>{data.tradeScore}/100</span></div>
        <div style={metricRow}><span style={labelStyle}>RISK LEVEL</span><span style={{ color: '#22c55e', fontWeight: 'bold' }}>{data.riskLevel}</span></div>
        <div style={{ ...metricRow, borderBottom: 'none' }}><span style={labelStyle}>RECOMMENDED EXPIRY</span><span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{data.expiry}</span></div>

        <div style={{ marginTop: '10px', padding: '8px', backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 'bold' }}>ENTRY NOW?</div>
          <div style={{ color: data.entryNow ? '#22c55e' : '#f43f5e', fontWeight: 'bold', fontSize: '13px', marginTop: '2px' }}>
            {data.entryNow ? '✓ YES' : '✕ NO'}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: TECHNICALS & CHECKLIST */}
      <div
        onMouseEnter={handleCardMouseEnter}
        style={{
          position: 'absolute',
          left: `${posRight.x}px`,
          top: `${posRight.y}px`,
          width: '290px',
          backgroundColor: 'rgba(6, 12, 20, 0.95)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '10px',
          padding: '12px',
          fontSize: '11px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.85)',
          resize: 'both',
          overflow: 'auto',
          pointerEvents: 'auto'
        }}
      >
        <div onMouseDown={startDragging(posRight, setPosRight)} style={dragHandleStyle}>
          ⠿ DRAG ANALYSIS PANEL
        </div>

        <div style={sectionTitleStyle}>SUPPORT & RESISTANCE</div>
        <div style={flexBetween}>
          <span>Nearest Support <strong style={{ color: '#ffffff' }}>{data.support}</strong></span>
          <span style={{ color: '#22c55e', fontSize: '10px' }}>{data.supportPts} PTS Below</span>
        </div>
        <div style={{ color: '#22c55e', marginBottom: '6px', fontSize: '10px' }}>Strength {'★'.repeat(data.supportStars || 3)}</div>

        <div style={flexBetween}>
          <span>Nearest Resistance <strong style={{ color: '#ffffff' }}>{data.resistance}</strong></span>
          <span style={{ color: '#f43f5e', fontSize: '10px' }}>{data.resistancePts} PTS Above</span>
        </div>
        <div style={{ color: '#f59e0b', marginBottom: '8px', fontSize: '10px' }}>Strength {'★'.repeat(data.resistanceStars || 4)}</div>

        <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>From Current Price</div>
        <div style={flexBetween}><span>To Support</span><span style={{ color: '#22c55e' }}>{data.toSupportPts || data.supportPts} PTS</span></div>
        <div style={{ ...flexBetween, marginBottom: '8px' }}><span>To Resistance</span><span style={{ color: '#f43f5e' }}>{data.toResistancePts || data.resistancePts} PTS</span></div>

        <div style={{ ...sectionTitleStyle, color: '#22c55e' }}>WHY TAKE THIS TRADE?</div>
        {data.whyTake?.map((item: string, idx: number) => (
          <div key={idx} style={{ color: '#e2e8f0', marginBottom: '2px', fontSize: '10px' }}>✓ {item}</div>
        ))}

        <div style={{ ...sectionTitleStyle, color: '#f43f5e', marginTop: '6px' }}>WHY NOT TAKE THIS TRADE?</div>
        {data.whyNotTake?.map((item: string, idx: number) => (
          <div key={idx} style={{ color: '#e2e8f0', marginBottom: '2px', fontSize: '10px' }}>✓ {item}</div>
        ))}

        <div style={{ ...sectionTitleStyle, color: '#f59e0b', marginTop: '6px' }}>NEAREST DANGER</div>
        {data.danger?.map((item: string, idx: number) => (
          <div key={idx} style={{ color: '#9ca3af', marginBottom: '2px', fontSize: '10px' }}>- {item}</div>
        ))}

        <div style={{ ...sectionTitleStyle, color: '#22c55e', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>AI CHECKLIST</div>
        <div style={{ display: 'grid', gap: '2px', fontSize: '10px' }}>
          <div style={flexBetween}><span>Support Safe</span><span style={{ color: data.checklist?.supportSafe ? '#22c55e' : '#f43f5e' }}>{data.checklist?.supportSafe ? 'Yes' : 'No'}</span></div>
          <div style={flexBetween}><span>Resistance Safe</span><span style={{ color: data.checklist?.resistanceSafe ? '#22c55e' : '#f43f5e' }}>{data.checklist?.resistanceSafe ? 'Yes' : 'No'}</span></div>
          <div style={flexBetween}><span>Liquidity Confirmed</span><span style={{ color: data.checklist?.liquidityConfirmed ? '#22c55e' : '#f43f5e' }}>{data.checklist?.liquidityConfirmed ? 'Yes' : 'No'}</span></div>
          <div style={flexBetween}><span>Candle Confirmed</span><span style={{ color: data.checklist?.candleConfirmed ? '#22c55e' : '#f43f5e' }}>{data.checklist?.candleConfirmed ? 'Yes' : 'No'}</span></div>
          <div style={flexBetween}><span>Risk Acceptable</span><span style={{ color: data.checklist?.riskAcceptable ? '#22c55e' : '#f43f5e' }}>{data.checklist?.riskAcceptable ? 'Yes' : 'No'}</span></div>
        </div>

        <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
          <span style={{ color: '#22c55e' }}>TRADE ALLOWED</span>
          <span style={{ color: '#22c55e' }}>{data.checklist?.tradeAllowed ? 'YES' : 'NO'}</span>
        </div>
      </div>

      {/* BOTTOM PANEL: RECENT SIGNALS & REASONS */}
      <div
        onMouseEnter={handleCardMouseEnter}
        style={{
          position: 'absolute',
          left: `${posBottom.x}px`,
          top: `${posBottom.y}px`,
          width: '520px',
          backgroundColor: 'rgba(6, 12, 20, 0.95)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '10px',
          padding: '10px 14px',
          pointerEvents: 'auto',
          fontSize: '11px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.85)',
          resize: 'both',
          overflow: 'auto'
        }}
      >
        <div onMouseDown={startDragging(posBottom, setPosBottom)} style={dragHandleStyle}>
          ⠿ DRAG BOTTOM BAR
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ color: '#9ca3af', fontWeight: 'bold', fontSize: '10px', marginBottom: '6px' }}>RECENT SIGNALS</div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {data.recentSignals?.map((item: any, idx: number) => (
                <div key={idx} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#64748b' }}>{item.time}</div>
                  <div style={{ color: item.action === 'BUY' ? '#22c55e' : item.action === 'SELL' ? '#f43f5e' : '#f59e0b', fontWeight: 'bold', fontSize: '11px' }}>
                    {item.action} {item.success === true ? '✓' : item.success === false ? '✕' : '--'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ color: '#9ca3af', fontWeight: 'bold', fontSize: '10px', marginBottom: '4px' }}>AI REASON (SHORT)</div>
            <ul style={{ margin: 0, paddingLeft: '12px', color: '#cbd5e1', fontSize: '10px' }}>
              {data.reasons?.map((reason: string, idx: number) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline Styling Objects
const badgeStyle = { backgroundColor: 'rgba(0, 0, 0, 0.85)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '5px', color: '#ffffff' };
const dotGreenStyle = { width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#22c55e' };
const dragHandleStyle = { cursor: 'move', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '2px', borderRadius: '4px', fontSize: '8px', color: '#64748b', fontWeight: 'bold' as const, marginBottom: '6px', textAlign: 'center' as const };
const metricRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '10px' };
const labelStyle = { color: '#9ca3af', fontWeight: 'bold' as const };
const sectionTitleStyle = { color: '#f59e0b', fontWeight: 'bold' as const, marginBottom: '3px', fontSize: '10px' };
const flexBetween = { display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', fontSize: '10px' };