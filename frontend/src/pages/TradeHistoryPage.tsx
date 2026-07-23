import React, { useState } from 'react';
import { useOverlayData } from '../hooks/useOverlayData';
import '../styles/DesktopPages.css';

export const TradeHistoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'journal' | 'analytics'>('journal');
  const { signalHistory } = useOverlayData();

  const history = Array.isArray(signalHistory) ? signalHistory : [];
  const completedTrades = history.filter((s) => s.outcome === 'WIN' || s.outcome === 'LOSS');
  const wins = completedTrades.filter((s) => s.outcome === 'WIN').length;

  const winRate = completedTrades.length > 0
    ? `${((wins / completedTrades.length) * 100).toFixed(1)}%`
    : 'No Completed Trades Yet';

  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Trade History & Analytics</h1>
          <div className="page-subtitle">Verified signal journal and performance analytics</div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar">
        <button
          className={`tab-item ${activeTab === 'journal' ? 'active' : ''}`}
          onClick={() => setActiveTab('journal')}
        >
          Signal Journal
        </button>
        <button
          className={`tab-item ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Performance Analytics
        </button>
      </div>

      {/* TAB 1: SIGNAL JOURNAL */}
      {activeTab === 'journal' && (
        <div className="prop-table-card">
          {history.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
              No completed trades
            </div>
          ) : (
            <table className="prop-table">
              <thead>
                <tr>
                  <th>TIMESTAMP</th>
                  <th>SIGNAL</th>
                  <th>EXPIRY</th>
                  <th>OUTCOME</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, i) => (
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
      )}

      {/* TAB 2: PERFORMANCE ANALYTICS */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="dash-grid-top">
            <div className="prop-card">
              <div className="prop-card-title">OVERALL WIN RATE</div>
              <div className="prop-card-val text-buy">{winRate}</div>
              <div className="prop-card-sub">{completedTrades.length} Verified Trades</div>
            </div>

            <div className="prop-card">
              <div className="prop-card-title">TOTAL SIGNALS</div>
              <div className="prop-card-val">{history.length}</div>
              <div className="prop-card-sub">Recorded by Engine</div>
            </div>

            <div className="prop-card">
              <div className="prop-card-title">TOTAL WINS</div>
              <div className="prop-card-val text-buy">{wins}</div>
              <div className="prop-card-sub">Successful Trades</div>
            </div>

            <div className="prop-card">
              <div className="prop-card-title">TOTAL LOSSES</div>
              <div className="prop-card-val text-sell">{completedTrades.length - wins}</div>
              <div className="prop-card-sub">Unsuccessful Trades</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeHistoryPage;
