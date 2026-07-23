import React, { useState } from 'react';
import { useVision } from '../hooks/useVision';
import { useWindowTracking } from '../../../shared/types/WindowTrackingContext';
import { Play, Square, Eye, EyeOff } from 'lucide-react';
import '../styles/DesktopPages.css';

export const LiveTrading: React.FC = () => {
  const { isActive, startVision, stopVision } = useVision();
  const { windowState } = useWindowTracking();

  const [broker, setBroker] = useState('Olymp Trade');
  const [isOverlayOn, setIsOverlayOn] = useState(true);

  const toggleOverlay = async () => {
    if ((window as any).electronAPI?.overlay?.toggle) {
      const isVisible = await (window as any).electronAPI.overlay.toggle();
      setIsOverlayOn(isVisible);
    } else {
      setIsOverlayOn(!isOverlayOn);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Live Control Center</h1>
          <div className="page-subtitle">Primary control center for engaging AI scanner and overlay window</div>
        </div>
      </div>

      {/* Primary Control Banner */}
      <div className="control-center-banner">
        <div className="cc-left">
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
            ENGINE CONTROL
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            {isActive ? 'ANALYSIS RUNNING' : 'ANALYSIS STOPPED'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {isActive ? 'Scanning live broker chart every 1000ms' : 'Click Start Analysis to engage live scanner'}
          </div>
        </div>

        <div className="cc-actions">
          {!isActive ? (
            <button className="btn-start" onClick={startVision}>
              <Play size={18} />
              Start Analysis
            </button>
          ) : (
            <button className="btn-stop" onClick={stopVision}>
              <Square size={18} />
              Stop Analysis
            </button>
          )}

          <button className="btn-overlay" onClick={toggleOverlay}>
            {isOverlayOn ? <Eye size={18} className="text-buy" /> : <EyeOff size={18} className="text-wait" />}
            <span>Overlay {isOverlayOn ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Target Broker Selection */}
      <div className="prop-card">
        <div className="prop-card-title" style={{ marginBottom: 16 }}>TARGET BROKER SELECTION</div>
        <div className="control-config-grid">
          <div className="control-field">
            <span className="field-label">BROKER PLATFORM</span>
            <select className="field-select" value={broker} onChange={(e) => setBroker(e.target.value)}>
              <option value="Olymp Trade">Olymp Trade (Exclusive)</option>
              <option value="Quotex">Quotex</option>
              <option value="Pocket Option">Pocket Option</option>
            </select>
          </div>
        </div>
      </div>

      {/* System Status Diagnostics */}
      <div className="dash-grid-top">
        <div className="prop-card">
          <div className="prop-card-title">AI ENGINE STATUS</div>
          <div className="prop-card-val" style={{ fontSize: '1.1rem', color: isActive ? '#00e676' : '#94a3b8' }}>
            {isActive ? 'RUNNING' : 'STOPPED'}
          </div>
          <div className="prop-card-sub">{isActive ? 'Cycle: 1000ms' : 'Engine Ready'}</div>
        </div>

        <div className="prop-card">
          <div className="prop-card-title">OLYMP TRADE CONNECTION</div>
          <div className="prop-card-val" style={{ fontSize: '1.1rem', color: windowState?.isFound ? '#00e676' : '#f59e0b' }}>
            {windowState?.isFound ? 'CONNECTED' : 'SEARCHING'}
          </div>
          <div className="prop-card-sub">{windowState?.brokerName || 'Olymp Trade'}</div>
        </div>

        <div className="prop-card">
          <div className="prop-card-title">CAPTURE STATUS</div>
          <div className="prop-card-val" style={{ fontSize: '1.1rem', color: windowState?.isFound ? '#00e676' : '#94a3b8' }}>
            {windowState?.isFound ? 'ACTIVE BIND' : 'WAITING FOR WINDOW'}
          </div>
          <div className="prop-card-sub">Screen Bounds Tracked</div>
        </div>

        <div className="prop-card">
          <div className="prop-card-title">OVERLAY WINDOW</div>
          <div className="prop-card-val" style={{ fontSize: '1.1rem', color: isOverlayOn ? '#00e676' : '#94a3b8' }}>
            {isOverlayOn ? 'ENABLED' : 'DISABLED'}
          </div>
          <div className="prop-card-sub">Floating Trading UI</div>
        </div>
      </div>
    </div>
  );
};

export default LiveTrading;
