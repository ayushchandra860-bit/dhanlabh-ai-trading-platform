import React from 'react';

interface TradeLogWidgetProps {
  signalHistory: any[];
  visionResult?: any;
}

export const TradeLogWidget: React.FC<TradeLogWidgetProps> = ({ signalHistory, visionResult }) => {
  const history = Array.isArray(signalHistory) ? signalHistory.slice(0, 5) : [];
  const decision = visionResult?.aiDecisionData;

  const currentReason = decision?.summary || 'Scanning for High Probability Trade...';

  return (
    <div className="v6-tradelog-widget" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 5 Recent Signal Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginRight: 4 }}>
          RECENT SIGNALS:
        </span>
        {history.length === 0 ? (
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>Awaiting signals...</span>
        ) : (
          history.map((item, i) => {
            const sig = item.signal || 'WAIT';
            const badgeClass =
              sig === 'BUY'
                ? 'pill-buy'
                : sig === 'SELL'
                ? 'pill-sell'
                : 'pill-wait';

            return (
              <span
                key={item.id || i}
                className={`v6-m-val pill ${badgeClass}`}
                style={{ fontSize: '0.68rem', padding: '2px 7px', fontWeight: 700 }}
              >
                {sig} ({item.time || 'NOW'})
              </span>
            );
          })
        )}
      </div>

      {/* 1 Clean Trader Reason Line */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: '0.75rem',
          color: '#cbd5e1',
          fontStyle: 'italic',
        }}
      >
        <span style={{ fontWeight: 700, color: '#94a3b8', fontStyle: 'normal', marginRight: 6 }}>
          Reason:
        </span>
        "{currentReason}"
      </div>
    </div>
  );
};
