import React from 'react';

interface AISignalWidgetProps {
  visionResult: any;
}

export const AISignalWidget: React.FC<AISignalWidgetProps> = ({ visionResult }) => {
  const decision = visionResult?.aiDecisionData;
  const market = visionResult?.marketState;

  const signal = decision?.signal ?? 'WAIT';

  // Format confidence
  const rawConf = decision?.confidence;
  const confidence = typeof rawConf === 'number' && !isNaN(rawConf) && rawConf > 0
    ? `${Math.round(rawConf)}%`
    : '60%';

  // Entry status
  const isEntryNow = decision?.entryRecommendation === 'YES';
  const entryText = isEntryNow ? 'NOW' : 'WAIT';

  // Expiry & Risk
  const expiry = decision?.recommendedExpiry ?? '1 Min';
  const riskLevel = decision?.riskLevel ?? 'LOW';

  // Translate technical AI terms into Trader Language
  const sanitizeTraderText = (text: string): string => {
    if (!text) return 'Scanning Live Market...';
    let clean = text
      .replace(/UNKNOWN_REGIME/gi, 'Market Direction Unclear')
      .replace(/TEMPORAL_ALIGNMENT/gi, 'Waiting for Better Setup')
      .replace(/AWAITING_DATA/gi, 'Scanning Live Market...')
      .replace(/NO HYPOTHESIS/gi, 'Looking for High Probability Trade')
      .replace(/COGNITIVE_HYPOTHESIS/gi, 'Market Strategy')
      .replace(/FEATURE_VECTORS/gi, 'Market Metrics')
      .replace(/BAYESIAN_POSTERIORS/gi, 'Probability Analysis')
      .replace(/SCIENTIFIC_REASONING/gi, 'Technical Summary');
    
    return clean;
  };

  // One-line summary (Max 1 short sentence in pure trader language)
  let oneLineReason = 'Scanning for High Probability Trade...';

  if (signal === 'BUY') {
    oneLineReason = 'Strong bullish momentum confirmed.';
  } else if (signal === 'SELL') {
    oneLineReason = 'Strong bearish momentum confirmed.';
  } else if (decision?.summary) {
    oneLineReason = sanitizeTraderText(decision.summary);
  } else if (market?.summary) {
    oneLineReason = sanitizeTraderText(market.summary.split('.')[0] + '.');
  }

  // Visual classes
  const badgeClass =
    signal === 'BUY'
      ? 'v6-signal-badge buy'
      : signal === 'SELL'
      ? 'v6-signal-badge sell'
      : 'v6-signal-badge wait';

  const signalIcon = signal === 'BUY' ? '▲' : signal === 'SELL' ? '▼' : '●';

  return (
    <div className="v6-signal-widget">
      {/* Massive Signal Badge */}
      <div className={badgeClass}>
        <span className="v6-sig-icon">{signalIcon}</span>
        <span className="v6-sig-text">{signal}</span>
      </div>

      {/* Metric Grid */}
      <div className="v6-metric-grid">
        <div className="v6-metric-cell">
          <div className="v6-m-label">CONFIDENCE</div>
          <div className="v6-m-val highlight">{confidence}</div>
        </div>

        <div className="v6-metric-cell">
          <div className="v6-m-label">ENTRY</div>
          <div className={`v6-m-val pill ${isEntryNow ? 'pill-buy' : 'pill-wait'}`}>
            {entryText}
          </div>
        </div>

        <div className="v6-metric-cell">
          <div className="v6-m-label">EXPIRY</div>
          <div className="v6-m-val">{expiry}</div>
        </div>

        <div className="v6-metric-cell">
          <div className="v6-m-label">RISK</div>
          <div className="v6-m-val">{riskLevel}</div>
        </div>
      </div>

      {/* One-Line Reason Footer */}
      <div className="v6-reason-footer">
        <span className="v6-reason-quote">"{oneLineReason}"</span>
      </div>
    </div>
  );
};
