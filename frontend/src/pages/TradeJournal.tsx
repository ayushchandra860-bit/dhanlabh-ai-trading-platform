import React, { useState, useEffect } from 'react';
import '../styles/TradeJournal.css';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000/api';

interface Trade {
  id: number;
  broker: string;
  pair: string;
  timestamp: string;
  direction: string;
  confidence: number;
  trade_score: number;
  ai_reason: string;
  market_structure: string;
  entry_price: number;
  exit_price: number;
  profit_loss: number;
  notes: string;
}

const TradeJournal: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/trades`);
        if (!response.ok) {
          throw new Error('Failed to fetch trades');
        }
        const data = await response.json();
        setTrades(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, []);

  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.profit_loss > 0).length;
  const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : '0.0';

  return (
    <div className="trade-journal-container">
      <h2>Trade Journal</h2>
      
      <div className="journal-stats">
        <div className="stat-card">
          <h4>Total Trades</h4>
          <p>{totalTrades}</p>
        </div>
        <div className="stat-card">
          <h4>Win Rate</h4>
          <p>{winRate}%</p>
        </div>
        <div className="stat-card">
          <h4>Net P/L</h4>
          <p className={trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0) >= 0 ? 'positive' : 'negative'}>
            ${trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0).toFixed(2)}
          </p>
        </div>
      </div>

      {loading ? (
        <p>Loading trades...</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : (
        <div className="table-container">
          <table className="journal-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Broker</th>
                <th>Pair</th>
                <th>Direction</th>
                <th>Conf %</th>
                <th>Score</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>P/L</th>
                <th>AI Reason</th>
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={10} className="empty-state">No trades recorded yet.</td>
                </tr>
              ) : (
                trades.map(trade => (
                  <tr key={trade.id}>
                    <td>{new Date(trade.timestamp).toLocaleString()}</td>
                    <td>{trade.broker}</td>
                    <td>{trade.pair}</td>
                    <td className={`direction ${trade.direction.toLowerCase()}`}>{trade.direction}</td>
                    <td>{trade.confidence}</td>
                    <td>{trade.trade_score}</td>
                    <td>{trade.entry_price || '-'}</td>
                    <td>{trade.exit_price || '-'}</td>
                    <td className={trade.profit_loss >= 0 ? 'positive' : 'negative'}>
                      {trade.profit_loss ? `$${trade.profit_loss}` : '-'}
                    </td>
                    <td className="reason-cell" title={trade.ai_reason}>{trade.ai_reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TradeJournal;
