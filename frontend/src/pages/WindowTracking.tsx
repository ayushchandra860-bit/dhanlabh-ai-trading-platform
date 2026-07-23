import React, { useState, useEffect } from 'react';
import '../styles/ControlPanel.css';
import { Save, RefreshCw, Crosshair, X } from 'lucide-react';
import { useWindowTracking } from '../../../shared/types/WindowTrackingContext';

const WindowTracking: React.FC = () => {
  const { windowState } = useWindowTracking();
  const [keywords, setKeywords] = useState('olymp,quotex,pocket');
  const [pollRate, setPollRate] = useState(1000);
  const [availableWindows, setAvailableWindows] = useState<any[]>([]);
  const [selectedWindowId, setSelectedWindowId] = useState<number | null>(null);

  const loadWindows = async () => {
    if ((window as any).electronAPI?.windowTracking) {
      const windows = await (window as any).electronAPI.windowTracking.getAvailableWindows();
      setAvailableWindows(windows);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      if ((window as any).electronAPI?.settings) {
        const settings = await (window as any).electronAPI.settings.get();
        if (settings?.windowTracking) {
          setKeywords(settings.windowTracking.keywords || 'olymp,quotex,pocket');
          setPollRate(settings.windowTracking.pollRate || 1000);
        }
      }
    };
    loadSettings();
    loadWindows();
  }, []);

  const handleSave = async () => {
    if ((window as any).electronAPI?.settings) {
      await (window as any).electronAPI.settings.set({
        windowTracking: { keywords, pollRate }
      });
      alert('Window tracking settings saved successfully.');
    }
  };

  const handleRescan = async () => {
    if ((window as any).electronAPI?.windowTracking) {
      await (window as any).electronAPI.windowTracking.getCurrentState();
    }
    loadWindows();
  };

  const handleManualSelection = (id: number | null) => {
    setSelectedWindowId(id);
    if ((window as any).electronAPI?.windowTracking) {
      (window as any).electronAPI.windowTracking.setManualOverride(id);
    }
  };

  return (
    <div className="cp-page">
      <h1 className="cp-title">Window Tracking</h1>

      <div className="cp-card">
        <h2 className="cp-card-title">Live Detection</h2>
        <div className="cp-status-row">
          <span className="cp-slider-label">Status:</span>
          <span className="cp-badge" style={{ backgroundColor: windowState?.isFound ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: windowState?.isFound ? '#10b981' : '#ef4444' }}>
            {windowState?.isFound ? 'LOCKED' : 'SEARCHING'}
          </span>
        </div>
        <div className="cp-status-row">
          <span className="cp-slider-label">Broker Name:</span>
          <span>{windowState?.brokerName || 'Not Detected'}</span>
        </div>
        <div className="cp-status-row">
          <span className="cp-slider-label">Position:</span>
          <span>X: {windowState?.position?.x || 0}, Y: {windowState?.position?.y || 0}</span>
        </div>
        <div className="cp-status-row">
          <span className="cp-slider-label">Size:</span>
          <span>W: {windowState?.size?.width || 0}, H: {windowState?.size?.height || 0}</span>
        </div>
        <div className="cp-status-row">
          <span className="cp-slider-label">Focus State:</span>
          <span className="cp-badge" style={{ backgroundColor: windowState?.isFocused ? 'rgba(0,170,255,0.15)' : 'rgba(139,148,158,0.15)', color: windowState?.isFocused ? '#00aaff' : '#8b949e' }}>
            {windowState?.isFocused ? 'FOCUSED' : 'UNFOCUSED'}
          </span>
        </div>
        <div className="cp-status-row">
          <span className="cp-slider-label">Tracking Mode:</span>
          <span className="cp-badge" style={{ backgroundColor: selectedWindowId !== null ? 'rgba(16,185,129,0.15)' : 'rgba(0,170,255,0.15)', color: selectedWindowId !== null ? '#10b981' : '#00aaff' }}>
            {selectedWindowId !== null ? 'MANUAL OVERRIDE' : 'AUTOMATIC'}
          </span>
        </div>
      </div>

      <div className="cp-card">
        <h2 className="cp-card-title">Manual Window Override</h2>
        <p style={{ fontSize: '0.8rem', color: '#8b949e', marginBottom: '16px' }}>
          Manually select a window to bypass automatic detection. This will lock DhanLabh AI to the specific window until it is closed.
        </p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <select 
            className="cp-input" 
            style={{ flex: 1, padding: '8px', borderRadius: '4px', background: '#0d1117', color: '#fff', border: '1px solid #30363d' }}
            value={selectedWindowId || ''}
            onChange={(e) => handleManualSelection(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">-- Select a window --</option>
            {availableWindows.map(win => (
              <option key={win.id} value={win.id}>{win.title} ({win.owner.name})</option>
            ))}
          </select>
          <button className="cp-btn ghost" onClick={loadWindows} title="Refresh window list">
            <RefreshCw size={16} />
          </button>
        </div>
        {selectedWindowId !== null && (
          <button className="cp-btn danger" onClick={() => handleManualSelection(null)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <X size={16} /> Clear Manual Selection (Return to Auto Mode)
          </button>
        )}
      </div>

      <div className="cp-card">
        <h2 className="cp-card-title">Configuration</h2>
        <div className="cp-form-row" style={{ display: 'flex', flexDirection: 'column' }}>
          <label className="cp-section-label" style={{ margin: '0 0 8px 0' }}>Target Window Keywords (comma separated)</label>
          <input 
            type="text" 
            className="cp-input" 
            value={keywords} 
            onChange={(e) => setKeywords(e.target.value)}
          />
        </div>
        <div className="cp-slider-row" style={{ marginTop: '24px' }}>
          <span className="cp-slider-label">Poll Rate</span>
          <input 
            type="range" 
            min="250" 
            max="5000" 
            step="50"
            value={pollRate}
            onChange={(e) => setPollRate(parseInt(e.target.value))}
          />
          <span className="cp-slider-val">{pollRate}ms</span>
        </div>
      </div>

      <button className="cp-btn primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Save size={16} />
        Save Settings
      </button>
    </div>
  );
};

export default WindowTracking;
