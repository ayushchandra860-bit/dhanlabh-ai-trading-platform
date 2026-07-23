import re

filepath = r"c:\\Users\\ayush\\Documents\\Dhanlabh V2\\frontend\\src\\pages\\Overlay.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update RightAnalysisPanel
old_right = content[content.find("const RightAnalysisPanel: React.FC<{ visionResult: any }> = ({ visionResult }) => {") : content.find("// Bottom History Panel")]
new_right = """const RightAnalysisPanel: React.FC<{ visionResult: any }> = ({ visionResult }) => {
  const initX = Math.max(0, window.innerWidth - 270);
  const [pos,  dragRef]   = useDrag('ol-right-pos',   { x: initX, y: 80 });
  const [size, resizeRef] = useResize('ol-right-size', { w: 255, h: 460 }, 200, 200);

  const sr        = visionResult?.supportResistanceData;
  const decision  = visionResult?.aiDecisionData;
  const reasoning = decision?.reasoning;

  const Pass = () => <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#10b981" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>;
  const Fail = () => <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#ef4444" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

  return (
    <div
      ref={combineRefs(dragRef, resizeRef)}
      className="ol-panel"
      style={{ left: pos.x, top: pos.y, width: size.w, minHeight: size.h, maxHeight: size.h, overflowY: 'auto' }}
    >
      <div className="ol-drag-handle">
        <span className="ol-section-label" style={{ marginBottom: 0 }}>SUPPORT & RESISTANCE</span>
        <span className="ol-drag-dots">⠿ drag</span>
      </div>

      {sr ? (
        <>
          {sr.nearestResistance && (
            <div className="ol-sr-row">
              <div>
                <div className="ol-sr-label">Nearest Resistance</div>
                <div className="ol-sr-price">{sr.nearestResistance.displayPrice ?? 'Calculating...'}</div>
                <div className="ol-sr-badge resist">{sr.nearestResistance.displayDistance ?? 'Calculating...'}</div>
              </div>
              <div><div className="ol-sr-label">Strength</div><div style={{ color: 'var(--ol-text)', fontSize: '11px', fontWeight: 'bold' }}>{sr.nearestResistance.strength ?? 0}/100</div></div>
            </div>
          )}
          {sr.nearestSupport && (
            <div className="ol-sr-row">
              <div>
                <div className="ol-sr-label">Nearest Support</div>
                <div className="ol-sr-price">{sr.nearestSupport.displayPrice ?? 'Calculating...'}</div>
                <div className="ol-sr-badge support">{sr.nearestSupport.displayDistance ?? 'Calculating...'}</div>
              </div>
              <div><div className="ol-sr-label">Strength</div><div style={{ color: 'var(--ol-text)', fontSize: '11px', fontWeight: 'bold' }}>{sr.nearestSupport.strength ?? 0}/100</div></div>
            </div>
          )}
        </>
      ) : (
        <div className="ol-empty-msg">Analyzing support & resistance…</div>
      )}

      <div className="ol-divider" />

      {reasoning?.positiveReasons?.length > 0 && (
        <>
          <div className="ol-section-label" style={{ color: '#10b981' }}>WHY TAKE THIS TRADE?</div>
          <ul className="ol-reason-list">
            {reasoning.positiveReasons.slice(0, 4).map((r: any, i: number) => (
              <li key={i} className="ol-reason-item" title={${r.moduleName} - }>
                <Pass />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span>{r.description}</span>
                  <span style={{ fontSize: '9px', color: 'var(--ol-muted)' }}>{r.confidence}% confidence</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {reasoning?.negativeReasons?.length > 0 && (
        <>
          <div className="ol-section-label" style={{ color: '#ef4444' }}>WHY NOT TAKE THIS TRADE?</div>
          <ul className="ol-reason-list">
            {reasoning.negativeReasons.slice(0, 3).map((r: any, i: number) => (
              <li key={i} className="ol-reason-item" title={${r.moduleName} - }>
                <Fail />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span>{r.description}</span>
                  <span style={{ fontSize: '9px', color: 'var(--ol-muted)' }}>{r.confidence}% confidence</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      
      {decision?.nearestDanger && decision.nearestDanger !== 'None' && (
        <>
          <div className="ol-divider" />
          <div className="ol-section-label" style={{ color: '#f59e0b' }}>NEAREST DANGER</div>
          <div style={{ fontSize: '11px', padding: '0 8px', color: '#f59e0b' }}>⚠️ {decision.nearestDanger}</div>
        </>
      )}

      {decision && (
        <>
          <div className="ol-divider" />
          <div className="ol-section-label">AI CHECKLIST</div>
          <ul className="ol-checklist">
            {(decision.checklist || []).map((item: any) => (
              <li key={item.label} className="ol-checklist-item">
                {item.ok ? <Pass /> : <Fail />}
                <span>{item.label}</span>
                <span style={{ color: item.ok ? '#10b981' : '#ef4444', marginLeft: 'auto' }}>{item.ok ? 'Yes' : 'No'}</span>
              </li>
            ))}
          </ul>
          <div className={ol-trade-allowed }>
            TRADE ALLOWED: {decision.isTradeAllowed ? 'YES' : 'NO'}
          </div>
        </>
      )}

      <div className="ol-resize-handle">◢</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
"""
content = content.replace(old_right, new_right)

# Fix LeftPanel logic
old_left = content[content.find("const LeftSignalPanel: React.FC<{ decision: any; sig: string }> = ({ decision, sig }) => {") : content.find("// Right Analysis Panel")]
new_left = """const LeftSignalPanel: React.FC<{ decision: any; sig: string }> = ({ decision, sig }) => {
  const [pos,  dragRef]   = useDrag('ol-left-pos',   { x: 12, y: 80 });
  const [size, resizeRef] = useResize('ol-left-size', { w: 200, h: 340 }, 160, 220);

  const sigClass  = sig === 'BUY' ? 'buy' : sig === 'SELL' ? 'sell' : 'wait';
  const risk      = decision?.riskLevel ?? 0;
  const riskClass = risk < 35 ? 'low' : risk < 65 ? 'med' : 'high';
  const riskLabel = risk < 35 ? 'LOW' : risk < 65 ? 'MEDIUM' : 'HIGH';
  const entry     = decision?.entryRecommendation ?? 'WAIT';
  const entryClass = entry === 'YES' ? 'yes' : entry === 'NO' ? 'no' : 'wait';

  return (
    <div
      ref={combineRefs(dragRef, resizeRef)}
      className="ol-panel ol-left-panel"
      style={{ left: pos.x, top: pos.y, width: size.w, minHeight: size.h }}
    >
      <div className="ol-drag-handle">
        <span className="ol-section-label" style={{ marginBottom: 0 }}>AI SIGNAL</span>
        <span className="ol-drag-dots">⠿ drag</span>
      </div>

      <div className={ol-signal-badge }>{sig}</div>
      <div className="ol-divider" />

      <div className="ol-data-row">
        <span className="ol-data-label">CONFIDENCE</span>
        <span className="ol-data-value">{decision?.confidence ?? 0}%</span>
      </div>
      <div className="ol-data-row">
        <span className="ol-data-label">TRADE SCORE</span>
        <span className="ol-data-value">{decision?.tradeScore ?? 0}/100</span>
      </div>
      <div className="ol-data-row">
        <span className="ol-data-label">RISK LEVEL</span>
        <span className={ol-data-value }>{riskLabel}</span>
      </div>
      <div className="ol-data-row">
        <span className="ol-data-label">REC. EXPIRY</span>
        <span className="ol-data-value">{decision?.recommendedExpiry ?? '—'}</span>
      </div>

      <div className="ol-divider" />
      <div className={ol-entry-badge }>
        ENTRY NOW? <strong>{entry}</strong>
      </div>

      <div className="ol-resize-handle">◢</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
"""
content = content.replace(old_left, new_left)

# Fix bottom panel reason.topReasons mapped to reason.positiveReasons
content = content.replace("reasoning?.topReasons?.length", "reasoning?.positiveReasons?.length")
content = content.replace("reasoning.topReasons.slice", "reasoning.positiveReasons.slice")

# Fix signal history array
content = content.replace("h.time", "new Date(h.time).toLocaleTimeString()")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished UI rewrite")
