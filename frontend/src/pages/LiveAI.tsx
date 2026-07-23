import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useVision } from '../hooks/useVision';
import { Play, Square, Settings as SettingsIcon, Database, Activity, GitCommit, GitBranch, Cpu, Network } from 'lucide-react';
import '../styles/LiveAI.css';

const LiveAI: React.FC = () => {
  const { visionResult, isActive, startVision, stopVision } = useVision();
  const navigate = useNavigate();

  // Extract new Domain 3-8 Backend Payloads from visionResult (Simulated mapping until IPC is fully wired)
  // The V2.1 Backend now returns proper TemporalContext and MARSRecommendation objects
  const decision = visionResult?.decision; // From RecommendationEngine
  const temporalContext = visionResult?.temporalContext; // From ContextAggregator
  const hypothesis = visionResult?.hypothesis; // From HypothesisGenerationEngine

  // Derive State
  const isWait = decision?.action === 'WAIT' || !decision;
  const signalClass = decision?.action?.toLowerCase() || 'wait';

  return (
    <div className="live-ai-dashboard">
      
      {/* HEADER BAR */}
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ margin: 0, fontWeight: 600, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>Cognitive Workstation</h2>
          <div style={{ display: 'flex', gap: '8px', opacity: isActive ? 1 : 0.4, transition: 'opacity 0.3s' }}>
            <span className="cp-badge" style={{ backgroundColor: 'var(--state-success)', color: '#000' }}>
              <Activity size={12} /> ENGINE LIVE
            </span>
            <span className="cp-badge" style={{ border: '1px solid var(--border-subtle)' }}>
              <Network size={12} /> MTF SYNC
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="cp-btn ghost" onClick={() => navigate('/database')} title="Knowledge Graph">
            <Database size={18} />
          </button>
          <button className="cp-btn ghost" onClick={() => navigate('/settings')} title="Settings">
            <SettingsIcon size={18} />
          </button>
          <button 
            className={`action-btn ${isActive ? 'stop' : 'start'}`}
            onClick={isActive ? stopVision : startVision}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isActive ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            {isActive ? 'HALT REASONING' : 'ENGAGE NEURAL CORE'}
          </button>
        </div>
      </div>

      {/* THREE COLUMN GRID */}
      <div className="dashboard-grid">
        
        {/* LEFT: Context & Environment (Domain 4) */}
        <div className="dashboard-left-panel">
          <div className="panel-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><GitBranch size={14} /> Market Regime</h3>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '16px' }}>
              {temporalContext?.marketRegime || 'UNKNOWN_REGIME'}
            </div>
            
            <h3>Temporal Alignment</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>1m Structure:</span>
                <span style={{ color: 'var(--text-primary)' }}>{temporalContext?.timeframeAlignment?.[0]?.trend || 'Awaiting'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>5m Structure:</span>
                <span style={{ color: 'var(--text-primary)' }}>{temporalContext?.timeframeAlignment?.[1]?.trend || 'Awaiting'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>15m Structure:</span>
                <span style={{ color: 'var(--text-primary)' }}>{temporalContext?.timeframeAlignment?.[2]?.trend || 'Awaiting'}</span>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Cpu size={14} /> Feature Vectors</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>VOLATILITY</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  {temporalContext?.featureVector?.[0]?.toFixed(3) || '0.000'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MOMENTUM</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  {temporalContext?.featureVector?.[1]?.toFixed(3) || '0.000'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SPREAD</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  {temporalContext?.featureVector?.[2]?.toFixed(3) || '0.000'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>STD DEV</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  {temporalContext?.featureVector?.[3]?.toFixed(3) || '0.000'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER: The Final Recommendation (Domain 8) */}
        <div className="dashboard-center" style={{ flexDirection: 'column', padding: '40px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
            Final Action
          </div>
          
          <div className={`signal-value ${signalClass}`} style={{ fontSize: '4rem', textShadow: '0 0 20px rgba(0,0,0,0.5)', marginBottom: '8px' }}>
            {decision?.action || 'STANDBY'}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '32px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Confidence:</span>
            <span style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
              {(decision?.confidence || 0).toFixed(1)}%
            </span>
          </div>

          <div style={{ 
            width: '100%', 
            padding: '24px', 
            background: 'var(--bg-base)', 
            borderRadius: '8px', 
            border: '1px solid var(--border-subtle)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {isActive && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, height: '2px', width: '100%',
                background: 'linear-gradient(90deg, transparent, var(--accent-primary), transparent)',
                animation: 'scanline 2s linear infinite'
              }} />
            )}
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitCommit size={14} /> SCIENTIFIC REASONING
            </h4>
            <div style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
              {decision?.scientificReasoning || 'Awaiting initial sensory input and graph traversal...'}
            </div>
          </div>
          
          {decision?.riskWarning && (
            <div style={{ 
              marginTop: '16px', 
              width: '100%', 
              padding: '12px', 
              borderRadius: '6px', 
              fontSize: '0.85rem',
              backgroundColor: decision.riskWarning.includes('CRITICAL') ? 'rgba(229, 72, 77, 0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${decision.riskWarning.includes('CRITICAL') ? 'rgba(229, 72, 77, 0.3)' : 'var(--border-subtle)'}`,
              color: decision.riskWarning.includes('CRITICAL') ? 'var(--state-error)' : 'var(--text-secondary)'
            }}>
              {decision.riskWarning}
            </div>
          )}
        </div>

        {/* RIGHT: Hypothesis & Bayesian State (Domain 5 & 6) */}
        <div className="dashboard-right-panel">
          <div className="panel-section highlight-box">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={14} /> Cognitive Hypothesis</h3>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, margin: '16px 0 8px 0' }}>
              {hypothesis?.prediction || 'AWAITING_DATA'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {hypothesis?.expectedOutcome || 'No forward hypothesis generated yet.'}
            </div>
          </div>

          <div className="panel-section">
            <h3>Bayesian Posteriors</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>P(H) Prior</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>0.500</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>P(E|H) Likelihood</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>0.000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>P(H|E) Posterior</span>
                <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 600, color: 'var(--accent-primary)' }}>0.000</span>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <style>{`
        @keyframes scanline {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default LiveAI;
