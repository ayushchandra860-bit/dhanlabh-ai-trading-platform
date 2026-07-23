import React, { useEffect, useState } from 'react';
import '../styles/OverlayPremium.css';
import { useOverlayData } from '../hooks/useOverlayData';

const Overlay: React.FC = () => {
  const { visionResult, signalHistory, aiStatus } = useOverlayData();
  const [opacity, setOpacity] = useState(1);
  const [isDebugMode, setIsDebugMode] = useState(false);

  useEffect(() => {
    document.documentElement.style.backgroundColor = 'transparent';
    document.body.style.backgroundColor = 'transparent';
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        setIsDebugMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const decision = visionResult?.aiDecisionData;
  const sr = visionResult?.supportResistanceData;
  const market = visionResult?.marketState;
  const trend = visionResult?.trendData;
  const reasoning = decision?.reasoning;
  
  // 1. AI DECISION
  
  // Validation Helpers
  const isValidNum = (n: any) => typeof n === 'number' && !Number.isNaN(n) && Number.isFinite(n);
  const isValidPrice = (n: any) => isValidNum(n) && n > 0;
  
  const validateFormat = (val: any, formatFn: (v: number) => string, fallback: string) => {
    return isValidNum(val) ? formatFn(val) : fallback;
  };

  const sig = decision?.signal ?? 'WAIT';
  
  // Clean, professional summary logic
  let oneLineSummary = 'Waiting for high-quality setup...';
  if (sig === 'BUY') oneLineSummary = 'Bullish momentum detected. Favorable conditions.';
  else if (sig === 'SELL') oneLineSummary = 'Bearish momentum detected. Favorable conditions.';
  else if (market?.summary) {
    const s = market.summary.toLowerCase();
    if (s.includes('insufficient') || s.includes('undefined')) oneLineSummary = 'No high-quality setup detected.';
    else oneLineSummary = market.summary.split('.')[0] + '.';
  }

  const conf = validateFormat(decision?.confidence, v => Math.round(v) + '%', 'Calculating...');
  const tradeQuality = validateFormat(decision?.tradeScore, v => String(Math.round(v)), 'Calculating...');
  // Derive Trade Readiness from Score
  const tradeReadiness = validateFormat(decision?.tradeScore, v => Math.min(100, Math.round(v + 12)) + '%', 'Calculating...');
  
  const riskLevel = decision?.riskLevel ?? 'Calculating...';
  const expiry = decision?.recommendedExpiry ?? 'Calculating...';
  const entryNow = decision?.entryRecommendation === 'YES';
  
  let stabilityText = 'Calculating...';
  if (isValidNum(decision?.signalStability)) {
    const s = decision.signalStability;
    stabilityText = s > 5000 ? 'Stable' : s > 2000 ? 'Forming' : 'Volatile';
  }

  // 2. MARKET ANALYSIS
  const trendDirection = market?.trendDirection || trend?.direction || 'Collecting Data...';
  const momentum = trend?.momentum || 'Collecting Data...';
  
  let marketStrength = 'Collecting Data...';
  if (market?.trendStrength !== undefined) {
    marketStrength = market.trendStrength < 30 ? 'Weak' : market.trendStrength < 70 ? 'Medium' : 'Strong';
  }

  const volatility = market?.volatility || 'Collecting Data...';
  
  let marketCondition = market?.structure || 'Collecting Data...';
  if (marketCondition.includes('undefined')) marketCondition = 'Sideways';
  else marketCondition = marketCondition.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  
  const currentPrice = sr?.currentPrice;
  const nearestSup = isValidPrice(sr?.nearestSupport) ? sr.nearestSupport.toFixed(5) : 'Calculating...';
  const nearestRes = isValidPrice(sr?.nearestResistance) ? sr.nearestResistance.toFixed(5) : 'Calculating...';
  
  const distSup = isValidPrice(sr?.nearestSupport) && isValidPrice(currentPrice) ? Math.abs(Math.round((currentPrice - sr.nearestSupport) * 100000)) : '...';
  const distRes = isValidPrice(sr?.nearestResistance) && isValidPrice(currentPrice) ? Math.abs(Math.round((sr.nearestResistance - currentPrice) * 100000)) : '...';

  // 3. AI REASONING (Strictly max 3)
  const reasonsToTrade = (reasoning?.positiveReasons || []).slice(0, 3);
  const reasonsToWait = (reasoning?.negativeReasons || []).slice(0, 3);
  const nearestDanger = decision?.nearestDanger || 'None detected';

  // Color mappings
  const borderClass = sig === 'BUY' ? 'border-buy' : sig === 'SELL' ? 'border-sell' : 'border-wait';
  const textClass = sig === 'BUY' ? 'ref-text-buy' : sig === 'SELL' ? 'ref-text-sell' : 'ref-text-wait';

  const renderNormalMode = () => (
    <div className="main-layout-grid">
      {/* LEFT COLUMN */}
      <div className="dock-left">
        
        {/* CARD 1: AI DECISION */}
        <div className={`ref-card ${borderClass} drag-active`}>
          <div className="ref-header">AI DECISION</div>
          <div className={`signal-massive ${textClass}`}>{sig}</div>
          <div style={{fontSize: '0.85rem', color: '#a3b3cc', textAlign: 'center', marginBottom: 16, fontStyle: 'italic'}}>
            "{oneLineSummary}"
          </div>
          
          <div className="decision-grid">
            <div>
              <div className="ref-label">CONFIDENCE</div>
              <div className={`ref-val-large ${textClass}`}>{conf}</div>
            </div>
            <div>
              <div className="ref-label">READINESS</div>
              <div className={`ref-val-large ${textClass}`}>{tradeReadiness}</div>
            </div>
          </div>
          
          <div className="ref-row" style={{marginTop: 12}}>
            <div className="ref-row-title">Trade Quality</div>
            <div className={`ref-row-val ${textClass}`} style={{fontWeight: 700}}>{tradeQuality}<span style={{fontSize:'0.85rem', color:'#8b949e'}}>/100</span></div>
          </div>

          <div className="ref-row">
            <div className="ref-row-title">Entry Now</div>
            <div className={`ref-row-val ${entryNow ? 'ref-text-buy' : 'ref-text-wait'}`} style={{fontWeight: 700}}>
              {entryNow ? 'YES' : 'NO'}
            </div>
          </div>
          
          <div className="ref-row">
            <div className="ref-row-title">Risk</div>
            <div className="ref-row-val">{riskLevel}</div>
          </div>
          
          <div className="ref-row">
            <div className="ref-row-title">Recommended Expiry</div>
            <div className="ref-row-val">{expiry}</div>
          </div>

          <div className="ref-row">
            <div className="ref-row-title">Signal Stability</div>
            <div className="ref-row-val">{stabilityText}</div>
          </div>
        </div>

        {/* CARD 4: RECENT SIGNALS */}
        <div className="ref-card border-neutral drag-active">
          <div className="ref-header" style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>RECENT SIGNALS</span>
            
          </div>
          <div className="recent-signals" style={{marginTop: 8}}>
            {signalHistory?.length > 0 ? signalHistory.slice(0, 5).map((s, i) => {
              return (
                <div key={s.id || i} className="rs-item no-drag" style={{display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                  <div className="rs-time" style={{width: '60px', color: '#8b949e'}}>{s.time}</div>
                  <div className={`rs-sig ${s.signal === 'BUY' ? 'ref-text-buy' : s.signal === 'SELL' ? 'ref-text-sell' : 'ref-text-wait'}`} style={{width: '60px'}}>{s.signal}</div>
                  <div style={{width: '60px', fontSize: '0.8rem', color: '#a3b3cc'}}>1 Min</div>
                  <div className="ref-text-dim" style={{width: '60px', textAlign: 'right', fontWeight: 600, fontSize: '0.8rem'}}>WAITING</div>
                </div>
              );
            }) : <div className="ref-text-dim" style={{padding: '10px 0', textAlign: 'center'}}>Waiting for First Verified Trade</div>}
          </div>
        </div>
      </div>

      {/* CENTER GAP (70% viewport for chart) */}
      <div className="dock-center"></div>

      {/* RIGHT COLUMN */}
      <div className="dock-right">
        
        {/* CARD 2: MARKET ANALYSIS */}
        <div className="ref-card border-neutral drag-active">
          <div className="ref-header">MARKET ANALYSIS</div>
          <div className="ref-row" style={{marginTop: 12}}>
            <div className="ref-row-title">Trend</div>
            <div className="ref-row-val">{trendDirection}</div>
          </div>
          <div className="ref-row">
            <div className="ref-row-title">Momentum</div>
            <div className="ref-row-val">{momentum}</div>
          </div>
          <div className="ref-row">
            <div className="ref-row-title">Market Strength</div>
            <div className="ref-row-val">{marketStrength}</div>
          </div>
          <div className="ref-row">
            <div className="ref-row-title">Volatility</div>
            <div className="ref-row-val">{volatility}</div>
          </div>
          <div className="ref-row">
            <div className="ref-row-title">Market Condition</div>
            <div className="ref-row-val">{marketCondition}</div>
          </div>
          
          <div style={{height: 1, background: 'rgba(255,255,255,0.1)', margin: '12px 0'}}></div>
          
          <div className="ref-row">
            <div className="ref-row-title">Nearest Support</div>
            <div className="ref-row-val">{nearestSup !== '0.00000' && nearestSup !== 'NaN' ? nearestSup : 'Calculating...'}</div>
          </div>
          <div className="ref-row" style={{marginBottom: 8}}>
            <div className="ref-row-title" style={{fontSize: '0.75rem', color: '#8b949e'}}>Distance to Support</div>
            <div className="ref-row-val ref-text-buy" style={{fontSize: '0.85rem'}}>{distSup !== '...' ? `${distSup} PTS` : '...'}</div>
          </div>

          <div className="ref-row">
            <div className="ref-row-title">Nearest Resistance</div>
            <div className="ref-row-val">{nearestRes !== '0.00000' && nearestRes !== 'NaN' ? nearestRes : 'Calculating...'}</div>
          </div>
          <div className="ref-row">
            <div className="ref-row-title" style={{fontSize: '0.75rem', color: '#8b949e'}}>Distance to Resistance</div>
            <div className="ref-row-val ref-text-sell" style={{fontSize: '0.85rem'}}>{distRes !== '...' ? `${distRes} PTS` : '...'}</div>
          </div>
        </div>

        {/* CARD 3: AI REASONING */}
        <div className="ref-card border-neutral drag-active">
          <div className="ref-header">AI REASONING</div>
          
          <div style={{marginTop: 12}}>
            <div className="ref-label" style={{color: 'var(--color-buy)'}}>REASONS TO TRADE</div>
            <ul className="ref-list">
              {reasonsToTrade.length > 0 ? reasonsToTrade.map((r: any, i: number) => (
                <li key={i} className="no-drag" style={{padding: '4px 0'}}><span style={{color: 'var(--color-buy)', marginRight: 6}}>✔</span> {r.description}</li>
              )) : <li className="ref-text-dim">Waiting for confirmation...</li>}
            </ul>
          </div>
          
          <div style={{marginTop: 16}}>
            <div className="ref-label" style={{color: 'var(--color-wait)'}}>REASONS TO WAIT</div>
            <ul className="ref-list">
              {reasonsToWait.length > 0 ? reasonsToWait.map((r: any, i: number) => (
                <li key={i} className="no-drag" style={{padding: '4px 0'}}><span style={{color: 'var(--color-wait)', marginRight: 6}}>⚠</span> {r.description}</li>
              )) : <li className="ref-text-dim">No major warnings</li>}
            </ul>
          </div>

          <div className="ref-row" style={{marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12}}>
            <div className="ref-row-title" style={{color: 'var(--color-sell)'}}>Nearest Danger</div>
            <div className="ref-row-val">{nearestDanger}</div>
          </div>
        </div>

      </div>
    </div>
  );

  const renderDebugMode = () => (
    <div className="debug-mode-panel drag-active">
      <div className="ref-header" style={{color: '#ef4444', fontSize: '1.2rem'}}>DEBUG MODE: ENGINEERING DIAGNOSTICS</div>
      <p style={{color: '#a3b3cc', marginBottom: 20}}>These raw metrics are exposed for developer diagnostics and are hidden in the normal trading overlay.</p>
      
      <div style={{display: 'flex', gap: 20, marginTop: 16}}>
        <div style={{flex: 1}}>
          <div className="ref-label">BAYESIAN POSTERIOR & REASONING</div>
          <pre className="debug-pre">{JSON.stringify(visionResult?.aiDecisionData?.reasoning, null, 2) || 'Collecting Data...'}</pre>
        </div>
        <div style={{flex: 1}}>
          <div className="ref-label">VISION METRICS & OCR PIPELINE</div>
          <pre className="debug-pre">{JSON.stringify(visionResult?.connectionData, null, 2) || 'Collecting Data...'}</pre>
        </div>
        <div style={{flex: 1}}>
          <div className="ref-label">FEATURE VECTORS & ALIGNMENT</div>
          <pre className="debug-pre">{JSON.stringify(visionResult?.marketState, null, 2) || 'Collecting Data...'}</pre>
        </div>
      </div>
    </div>
  );

  
  if (aiStatus === 'RECOVERING') {
    return (
      <div className="overlay-v2-root" style={{ opacity, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <i className="fa-solid fa-triangle-exclamation fa-3x" style={{color: '#eab308', marginBottom: 20}}></i>
        <div style={{fontSize: '1.2rem', color: '#eab308', fontWeight: 'bold'}}>Recovering Vision Engine...</div>
        <div style={{fontSize: '0.9rem', color: '#a3b3cc', marginTop: 10}}>The AI watchdog detected a stalled subsystem and is restarting it safely.</div>
      </div>
    );
  }
  
  return (
    <div className="overlay-v2-root" style={{ opacity }}>
      {/* DRAG HANDLE FOR ENTIRE WINDOW */}
      <div className="window-drag-region"></div>

      {/* TOP CONTROLS */}
      <div className="overlay-controls no-drag">
        <button onClick={() => setIsDebugMode(!isDebugMode)} className="debug-toggle-btn">
          <i className="fa-solid fa-code"></i> {isDebugMode ? 'EXIT DEBUG MODE' : 'DEVELOPER MODE'}
        </button>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <i className="fa-solid fa-eye" style={{color: '#a3b3cc', fontSize: '0.8rem'}}></i>
          <input type="range" min="0.2" max="1" step="0.1" value={opacity} onChange={e => setOpacity(parseFloat(e.target.value))} className="opacity-slider"/>
        </div>
      </div>

      {isDebugMode ? renderDebugMode() : renderNormalMode()}
    </div>
  );
};

export default Overlay;
