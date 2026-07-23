import React, { useState, useEffect } from 'react';
import '../styles/ControlPanel.css';
import { Save } from 'lucide-react';

const AIThresholds: React.FC = () => {
  const [t, setT] = useState({
    minOcrConfidence: 50,
    minVisionConfidence: 60,
    minChartDetectionConfidence: 70,
    minTradeScoreForDecision: 70,
    minConfluenceScoreForDecision: 75,
    minConfidenceForTrade: 60,
    maxRiskForTrade: 60,
    wTrend: 1.5,
    wMarketStructure: 1.8,
    wBosChoch: 2.0,
    wLiquidity: 1.7,
    wOrderBlock: 1.9,
    wFvg: 1.6,
    wPriceAction: 1.4,
    wSupportResistance: 1.2,
    minCandlesTrend: 10,
    minCandlesStructure: 15,
    minCandlesLiquidity: 20,
    minCandlesOrderBlock: 5,
    minCandlesFvg: 3,
  });

  const handleChange = (key: string, val: number) => {
    setT(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    if ((window as any).electronAPI?.settings) {
      await (window as any).electronAPI.settings.set({ thresholds: t });
      alert('Thresholds saved successfully.');
    }
  };

  return (
    <div className="cp-page">
      <h1 className="cp-title">AI Thresholds</h1>

      <div className="cp-card">
        <h2 className="cp-card-title">Confidence Thresholds (%)</h2>
        {[
          { k: 'minOcrConfidence', l: 'Min OCR Confidence' },
          { k: 'minVisionConfidence', l: 'Min Vision Confidence' },
          { k: 'minChartDetectionConfidence', l: 'Min Chart Detection' }
        ].map(item => (
          <div className="cp-slider-row" key={item.k}>
            <span className="cp-slider-label">{item.l}</span>
            <input type="range" min="0" max="100" value={(t as any)[item.k]} onChange={e => handleChange(item.k, parseInt(e.target.value))} />
            <span className="cp-slider-val">{(t as any)[item.k]}%</span>
          </div>
        ))}
      </div>

      <div className="cp-card">
        <h2 className="cp-card-title">Decision Thresholds (%)</h2>
        {[
          { k: 'minTradeScoreForDecision', l: 'Min Trade Score' },
          { k: 'minConfluenceScoreForDecision', l: 'Min Confluence Score' },
          { k: 'minConfidenceForTrade', l: 'Min Trade Confidence' },
          { k: 'maxRiskForTrade', l: 'Max Risk Allowed' }
        ].map(item => (
          <div className="cp-slider-row" key={item.k}>
            <span className="cp-slider-label">{item.l}</span>
            <input type="range" min="0" max="100" value={(t as any)[item.k]} onChange={e => handleChange(item.k, parseInt(e.target.value))} />
            <span className="cp-slider-val">{(t as any)[item.k]}%</span>
          </div>
        ))}
      </div>

      <div className="cp-card">
        <h2 className="cp-card-title">Confluence Weights</h2>
        {[
          { k: 'wTrend', l: 'Trend' },
          { k: 'wMarketStructure', l: 'Market Structure' },
          { k: 'wBosChoch', l: 'BOS / CHoCH' },
          { k: 'wLiquidity', l: 'Liquidity Pools' },
          { k: 'wOrderBlock', l: 'Order Blocks' },
          { k: 'wFvg', l: 'Fair Value Gaps' },
          { k: 'wPriceAction', l: 'Price Action' },
          { k: 'wSupportResistance', l: 'Support & Resistance' }
        ].map(item => (
          <div className="cp-slider-row" key={item.k}>
            <span className="cp-slider-label">{item.l}</span>
            <input type="range" min="0.1" max="3.0" step="0.1" value={(t as any)[item.k]} onChange={e => handleChange(item.k, parseFloat(e.target.value))} />
            <span className="cp-slider-val">{(t as any)[item.k].toFixed(1)}x</span>
          </div>
        ))}
      </div>

      <div className="cp-card">
        <h2 className="cp-card-title">Minimum Candles Required</h2>
        <div className="cp-form-row">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label className="cp-section-label">Trend</label>
            <input type="number" className="cp-input" value={t.minCandlesTrend} onChange={e => handleChange('minCandlesTrend', parseInt(e.target.value))} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label className="cp-section-label">Structure</label>
            <input type="number" className="cp-input" value={t.minCandlesStructure} onChange={e => handleChange('minCandlesStructure', parseInt(e.target.value))} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label className="cp-section-label">Liquidity</label>
            <input type="number" className="cp-input" value={t.minCandlesLiquidity} onChange={e => handleChange('minCandlesLiquidity', parseInt(e.target.value))} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label className="cp-section-label">Order Block</label>
            <input type="number" className="cp-input" value={t.minCandlesOrderBlock} onChange={e => handleChange('minCandlesOrderBlock', parseInt(e.target.value))} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label className="cp-section-label">FVG</label>
            <input type="number" className="cp-input" value={t.minCandlesFvg} onChange={e => handleChange('minCandlesFvg', parseInt(e.target.value))} />
          </div>
        </div>
      </div>

      <button className="cp-btn primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Save size={16} />
        Save Settings
      </button>
    </div>
  );
};

export default AIThresholds;
