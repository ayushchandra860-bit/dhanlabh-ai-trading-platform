import React from 'react';
import { useVision } from '../hooks/useVision';
import { useOverlayData } from '../hooks/useOverlayData';
import { useWindowTracking } from '../../../shared/types/WindowTrackingContext';
import '../styles/DesktopPages.css';

export const Dashboard: React.FC = () => {
  const { isActive } = useVision();
  const { signalHistory } = useOverlayData();
  const { windowState } = useWindowTracking();

  // Calculate real performance stats from signal history
  const history = Array.isArray(signalHistory) ? signalHistory : [];
  const completedTrades = history.filter((s) => s.outcome === 'WIN' || s.outcome === 'LOSS');
  const wins = completedTrades.filter((s) => s.outcome === 'WIN').length;
  const losses = completedTrades.length - wins;

  const winRateText = completedTrades.length > 0
    ? `${((wins / completedTrades.length) * 100).toFixed(1)}%`
    : 'No Completed Trades Yet';

  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Control Center Dashboard</h1>
          <div className="page-subtitle">Desktop status, system connections, and performance statistics</div>
        </div>
      </div>

      {/* Performance & Status Cards ONLY (No Market / Signal duplicates) */}
      <div className="dash-grid-top">
        <div className="prop-card">
          <div className="prop-card-title">AI ENGINE STATUS</div>
          <div className="prop-card-val" style={{ fontSize: '1.2rem', color: isActive ? '#00e676' : '#94a3b8' }}>
            {isActive ? 'SCANNING ACTIVE' : 'ENGINE IDLE'}
          </div>
          <div className="prop-card-sub">{isActive ? '1000ms Cycle Rate' : 'Click Start in Live Controls'}</div>
        </div>

        <div className="prop-card">
          <div className="prop-card-title">OLYMP TRADE CONNECTION</div>
          <div className="prop-card-val" style={{ fontSize: '1.2rem', color: windowState?.isFound ? '#00e676' : '#f59e0b' }}>
            {windowState?.isFound ? 'CONNECTED' : 'SEARCHING'}
          </div>
          <div className="prop-card-sub">{windowState?.brokerName || 'Olymp Trade'}</div>
        </div>

        <div className="prop-card">
          <div className="prop-card-title">TODAY'S WIN RATE</div>
          <div className="prop-card-val text-buy">{winRateText}</div>
          <div className="prop-card-sub">{completedTrades.length} Verified Trades</div>
        </div>

        <div className="prop-card">
          <div className="prop-card-title">TOTAL WINS / LOSSES</div>
          <div className="prop-card-val">
            <span className="text-buy">{wins}W</span> / <span className="text-sell">{losses}L</span>
          </div>
          <div className="prop-card-sub">Recorded by Engine</div>
        </div>
      </div>

      {/* Trade History Feed */}
      <div className="prop-table-card">
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: '0.88rem' }}>
          VERIFIED TRADE HISTORY
        </div>
        {history.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
            No completed trades yet
          </div>
        ) : (
          <table className="prop-table">
            <thead>
              <tr>
                <th>TIME</th>
                <th>SIGNAL</th>
                <th>EXPIRY</th>
                <th>OUTCOME</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 10).map((item, i) => (
                <tr key={item.id || i}>
                  <td>{item.time || '14:00'}</td>
                  <td className={item.signal === 'BUY' ? 'text-buy' : item.signal === 'SELL' ? 'text-sell' : 'text-wait'}>
                    {item.signal}
                  </td>
                  <td>{item.expiry || '1M'}</td>
                  <td>
                    <span className={`outcome-tag ${(item.outcome || 'WAITING').toLowerCase()}`}>
                      {item.outcome || 'WAITING'} {item.outcome === 'WIN' ? '🟢' : item.outcome === 'LOSS' ? '🔴' : '⏳'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
