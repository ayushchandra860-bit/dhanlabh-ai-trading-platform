import React, { useEffect, useState } from 'react';
import '../styles/ControlPanel.css';
import TradeJournal from './TradeJournal';
import { Camera, Download } from 'lucide-react';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000/api';

const DatabasePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'journal' | 'captures'>('journal');
  const [captures, setCaptures] = useState<any[]>([]);

  useEffect(() => {
    (window as any).electronAPI?.capture?.getAll?.().then((items: any[]) => {
      setCaptures(items ?? []);
    });
  }, []);

  const handleExportCsv = async () => {
    const response = await fetch(`${API_BASE_URL}/trades`);
    if (!response.ok) return;
    const trades = await response.json();
    const headers = ['id', 'timestamp', 'broker', 'pair', 'direction', 'confidence', 'trade_score', 'profit_loss', 'ai_reason'];
    const csv = [
      headers.join(','),
      ...trades.map((trade: any) => headers.map(key => JSON.stringify(trade[key] ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dhanlabh-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="cp-page">
      <h1 className="cp-title">Database & Records</h1>

      <div className="cp-tab-bar">
        <div 
          className={`cp-tab ${activeTab === 'journal' ? 'active' : ''}`}
          onClick={() => setActiveTab('journal')}
        >
          Trade Journal
        </div>
        <div 
          className={`cp-tab ${activeTab === 'captures' ? 'active' : ''}`}
          onClick={() => setActiveTab('captures')}
        >
          Signal Captures
        </div>
      </div>

      {activeTab === 'journal' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button className="cp-btn ghost" onClick={handleExportCsv} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={16} />
              Export CSV
            </button>
          </div>
          <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', background: '#161b22', padding: '20px' }}>
            <TradeJournal />
          </div>
        </div>
      )}

      {activeTab === 'captures' && (
        <div className="cp-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px', textAlign: 'center', minHeight: '300px' }}>
          <Camera size={48} color="#8b949e" style={{ marginBottom: '16px', opacity: 0.5 }} />
          {captures.length === 0 ? (
            <>
              <p style={{ color: '#e0e0e0', fontSize: '1rem', marginBottom: '8px' }}>No signal captures recorded.</p>
              <p style={{ color: '#8b949e', fontSize: '0.875rem' }}>Captures appear here after live AI produces a saved signal.</p>
            </>
          ) : (
            <table className="cp-table">
              <thead><tr><th>Time</th><th>Signal</th><th>Confidence</th><th>Asset</th><th>Image</th></tr></thead>
              <tbody>
                {captures.map(capture => (
                  <tr key={capture.id}>
                    <td>{new Date(capture.timestamp).toLocaleString()}</td>
                    <td>{capture.decision}</td>
                    <td>{capture.confidence}%</td>
                    <td>{capture.assetName}</td>
                    <td>{capture.imagePath}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default DatabasePage;
