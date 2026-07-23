import React from 'react';

// Validation Helpers
const isValidNum = (n: any) => typeof n === 'number' && !Number.isNaN(n) && Number.isFinite(n);

const validateFormat = (val: any, formatFn: (v: number) => string, fallback: string) => {
  return isValidNum(val) ? formatFn(val) : fallback;
};

interface AiDecisionCardProps {
  decision: any;
  market: any;
}

/** Card body: AI DECISION — signal, confidence, readiness, quality, risk, expiry, stability */
const AiDecisionCard: React.FC<AiDecisionCardProps> = ({ decision, market }) => {
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

  const textClass = sig === 'BUY' ? 'ref-text-buy' : sig === 'SELL' ? 'ref-text-sell' : 'ref-text-wait';

  return (
    <>
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
    </>
  );
};

export default AiDecisionCard;
