import React, { useState, useEffect } from 'react';
import { Power, Activity, Eye, Monitor, ShieldCheck, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import '../styles/ControlPanel.css';
import { useVision } from '../hooks/useVision';
import { useWindowTracking } from '../../../shared/types/WindowTrackingContext';

const ControlPanel: React.FC = () => {
  const { isActive, startVision, stopVision, visionResult } = useVision();
  const { windowState } = useWindowTracking();
  const [uptime, setUptime] = useState(0);
  const [signalCount, setSignalCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<{time: string, msg: string, type: 'info' | 'signal'}[]>([]);

  // Track session uptime
  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => {
        setUptime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  // Log only significant events to avoid spam
  useEffect(() => {
    if (visionResult) {
      const decision = visionResult.aiDecisionData?.signal ?? 'WAIT';
      if (decision === 'BUY' || decision === 'SELL') {
        setSignalCount(prev => prev + 1);
        setRecentActivity(prev => [
          { time: new Date().toLocaleTimeString(), msg: `Generated ${decision} signal`, type: 'signal' as const },
          ...prev,
        ].slice(0, 8));
      }
    }
  }, [visionResult]);

  // Log system state changes
  useEffect(() => {
    if (isActive) {
      setRecentActivity(prev => [
        { time: new Date().toLocaleTimeString(), msg: 'AI Engine started', type: 'info' as const },
        ...prev,
      ].slice(0, 8));
    } else if (uptime > 0) {
      setRecentActivity(prev => [
        { time: new Date().toLocaleTimeString(), msg: 'AI Engine stopped', type: 'info' as const },
        ...prev,
      ].slice(0, 8));
    }
  }, [isActive]);

  useEffect(() => {
    if (isActive && windowState?.isFound) {
      setRecentActivity(prev => [
        { time: new Date().toLocaleTimeString(), msg: `Secured connection to ${windowState.brokerName}`, type: 'info' as const },
        ...prev,
      ].slice(0, 8));
    }
  }, [isActive, windowState?.isFound, windowState?.brokerName]);

  const toggleVision = () => {
    if (isActive) stopVision();
    else startVision();
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // Derive Trust State
  const isBrokerConnected = windowState?.isFound;
  const isChartVisible = !!visionResult;
  
  let trustStatus = "System Offline";
  let trustMessage = "Start the AI engine to begin market analysis.";
  let trustColor = "idle";

  if (isActive) {
    if (!isBrokerConnected) {
      trustStatus = "Waiting for Broker Connection";
      trustMessage = "Please open your broker window (e.g., Olymp Trade) to continue.";
      trustColor = "warn";
    } else if (!isChartVisible) {
      trustStatus = "Searching for Chart Data";
      trustMessage = "Broker connected, but the trading chart is currently obscured or loading.";
      trustColor = "warn";
    } else {
      trustStatus = "Actively Analyzing Markets";
      trustMessage = "All systems operational. The AI is monitoring live market data.";
      trustColor = "active";
    }
  }

  // Format Helpers
  const getConfidenceLabel = (conf?: number) => {
    if (conf === undefined || conf === null) return 'Calculating...';
    if (conf >= 80) return `High Confidence`;
    if (conf >= 60) return `Moderate Confidence`;
    return `Low Confidence`;
  };

  const getTradeScoreLabel = (score?: number) => {
    if (score === undefined || score === null) return 'Awaiting Data...';
    if (score >= 75) return 'Optimal Entry Conditions';
    if (score >= 50) return 'Weak Setup / Unfavorable';
    return 'No Setup Detected';
  };

  const latestDecision = visionResult?.aiDecisionData;

  return (
    <div className="cp-page">
      <h1 className="cp-title">Home Dashboard</h1>
      
      <section className="cp-hero" style={{ borderColor: trustColor === 'active' ? 'rgba(16, 185, 129, 0.3)' : trustColor === 'warn' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.1)' }}>
        <div>
          <div className="cp-kicker" style={{ color: trustColor === 'active' ? 'var(--success-color)' : trustColor === 'warn' ? 'var(--warning-color)' : 'var(--text-secondary)' }}>
            {trustColor === 'active' ? '● LIVE TRADING SESSION' : '● STANDBY MODE'}
          </div>
          <h2>{trustStatus}</h2>
          <p>{trustMessage}</p>
        </div>
        <button 
          className={`ai-start-btn ${isActive ? 'running' : 'stopped'}`}
          onClick={toggleVision}
        >
          <Power size={24} />
          {isActive ? 'STOP AI ENGINE' : 'START AI ENGINE'}
        </button>
      </section>

      <div className="cp-health-grid" style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        <div className="cp-health-tile" style={{ flex: 1 }}>
          <div className={`cp-dot ${isActive ? 'active' : 'idle'}`}></div>
          <div className="cp-health-icon"><Activity size={16} /></div>
          <span>Core Engine</span>
          <strong>{isActive ? 'Online' : 'Offline'}</strong>
        </div>
        <div className="cp-health-tile" style={{ flex: 1 }}>
          <div className={`cp-dot ${isBrokerConnected ? 'active' : (isActive ? 'warn' : 'idle')}`}></div>
          <div className="cp-health-icon"><Monitor size={16} /></div>
          <span>Broker Connection</span>
          <strong>{isBrokerConnected ? 'Secured' : 'Disconnected'}</strong>
        </div>
        <div className="cp-health-tile" style={{ flex: 1 }}>
          <div className={`cp-dot ${isChartVisible && visionResult?.analysisData?.captureLatency ? 'active' : (isActive && isBrokerConnected ? 'warn' : 'idle')}`}></div>
          <div className="cp-health-icon"><Monitor size={16} /></div>
          <span>Screen Capture</span>
          <strong>{visionResult?.analysisData?.captureLatency ? `${visionResult.analysisData.captureLatency.toFixed(0)}ms latency` : 'Standby'}</strong>
        </div>
        <div className="cp-health-tile" style={{ flex: 1 }}>
          <div className={`cp-dot ${isChartVisible ? 'active' : (isActive && isBrokerConnected ? 'warn' : 'idle')}`}></div>
          <div className="cp-health-icon"><Eye size={16} /></div>
          <span>Visual Pipeline</span>
          <strong>{isChartVisible ? 'Processing' : 'Awaiting Data'}</strong>
        </div>
      </div>

      <div className="cp-grid-2">
        <div className="cp-card">
          <h2 className="cp-card-title">Live Market Analysis</h2>
          <div className="cp-big-number">
            {signalCount} <span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>Signals Today</span>
          </div>
          <div className="cp-status-row">
            <span className="cp-slider-label">Current Market Sentiment</span>
            <span className="cp-badge" style={{
              background: latestDecision?.signal === 'BUY' ? 'rgba(16,185,129,0.15)' : latestDecision?.signal === 'SELL' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
              color: latestDecision?.signal === 'BUY' ? 'var(--success-color)' : latestDecision?.signal === 'SELL' ? 'var(--danger-color)' : '#fff',
              fontSize: '0.85rem', padding: '6px 12px'
            }}>
              {latestDecision?.signal === 'BUY' || latestDecision?.signal === 'SELL' ? `${latestDecision.signal} Signal` : 'Neutral / Waiting'}
            </span>
          </div>
          <div className="cp-status-row">
            <span className="cp-slider-label">Signal Quality</span>
            <strong style={{ color: latestDecision && latestDecision.confidence >= 75 ? 'var(--success-color)' : 'var(--text-primary)' }}>
              {getConfidenceLabel(latestDecision?.confidence)}
            </strong>
          </div>
          <div className="cp-status-row">
            <span className="cp-slider-label">Entry Assessment</span>
            <strong style={{ color: 'var(--text-primary)' }}>{getTradeScoreLabel(latestDecision?.tradeScore)}</strong>
          </div>
        </div>

        <div className="cp-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 className="cp-card-title">Session Activity log</h2>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentActivity.length > 0 ? recentActivity.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ 
                  color: item.type === 'signal' ? 'var(--success-color)' : 'var(--text-secondary)',
                  marginTop: '2px'
                }}>
                  {item.type === 'signal' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{item.msg}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.time}</div>
                </div>
              </div>
            )) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', gap: '12px' }}>
                <AlertCircle size={32} style={{ opacity: 0.5 }} />
                <span style={{ fontSize: '0.85rem' }}>No activity recorded in this session.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
