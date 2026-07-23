import React from 'react';

interface MarketWidgetProps {
  visionResult: any;
}

export const MarketWidget: React.FC<MarketWidgetProps> = ({ visionResult }) => {
  const decision = visionResult?.aiDecisionData;
  const market = visionResult?.marketState;
  const trend = visionResult?.trendData;
  const sr = visionResult?.supportResistanceData;

  const rawTrend = market?.trendDirection || trend?.direction || 'Scanning...';
  const isTrendAligned = Boolean(rawTrend && !rawTrend.toLowerCase().includes('side') && !rawTrend.toLowerCase().includes('scan'));
  const isMomentumConfirmed = Boolean(trend?.momentumScore ? trend.momentumScore > 5 : (trend?.momentum && trend.momentum !== 'Low'));
  const isSrClear = Boolean(!decision?.nearestDanger || decision.nearestDanger === 'None');

  const isTradeAllowed = Boolean(decision?.isTradeAllowed && isTrendAligned && isSrClear);

  const currentPrice = sr?.currentPrice;
  const support = typeof sr?.nearestSupport === 'number' && sr.nearestSupport > 0 ? sr.nearestSupport.toFixed(5) : '...';
  const resistance = typeof sr?.nearestResistance === 'number' && sr.nearestResistance > 0 ? sr.nearestResistance.toFixed(5) : '...';

  const distSup = typeof sr?.nearestSupport === 'number' && typeof currentPrice === 'number'
    ? `${Math.abs(Math.round((currentPrice - sr.nearestSupport) * 100000))} PTS`
    : '...';

  const distRes = typeof sr?.nearestResistance === 'number' && typeof currentPrice === 'number'
    ? `${Math.abs(Math.round((sr.nearestResistance - currentPrice) * 100000))} PTS`
    : '...';

  return (
    <div className="v6-market-widget">
      {/* Status Badge */}
      <div style={{ marginBottom: 12, textAlign: 'center' }}>
        <span
          className={`outcome-tag ${isTradeAllowed ? 'win' : 'loss'}`}
          style={{ fontSize: '0.82rem', padding: '4px 12px', display: 'inline-block', fontWeight: 700 }}
        >
          {isTradeAllowed ? '✓ TRADE ALLOWED' : '⚠ WAIT / HIGH RISK'}
        </span>
      </div>

      <div className="v6-info-grid">
        {/* Support & Resistance */}
        <div className="v6-info-row">
          <span className="v6-info-label">Support</span>
          <span className="v6-info-val text-buy">
            {support} <span className="v6-dist-tag">({distSup})</span>
          </span>
        </div>

        <div className="v6-info-row">
          <span className="v6-info-label">Resistance</span>
          <span className="v6-info-val text-sell">
            {resistance} <span className="v6-dist-tag">({distRes})</span>
          </span>
        </div>

        <div className="v6-info-divider" />

        {/* 3-Point Checklist */}
        <div className="v6-info-row">
          <span className="v6-info-label">1. Trend Alignment</span>
          <span className={`v6-info-val ${isTrendAligned ? 'text-buy' : 'text-wait'}`}>
            {isTrendAligned ? 'YES' : 'NO'}
          </span>
        </div>

        <div className="v6-info-row">
          <span className="v6-info-label">2. Momentum Confirmation</span>
          <span className={`v6-info-val ${isMomentumConfirmed ? 'text-buy' : 'text-wait'}`}>
            {isMomentumConfirmed ? 'YES' : 'NO'}
          </span>
        </div>

        <div className="v6-info-row">
          <span className="v6-info-label">3. S/R Clearance</span>
          <span className={`v6-info-val ${isSrClear ? 'text-buy' : 'text-sell'}`}>
            {isSrClear ? 'YES' : 'NO'}
          </span>
        </div>
      </div>
    </div>
  );
};
