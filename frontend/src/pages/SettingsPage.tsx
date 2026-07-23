import React, { useState } from 'react';
import '../styles/DesktopPages.css';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'general' | 'trading' | 'overlay' | 'vision' | 'ocr' | 'appearance' | 'hotkeys' | 'developer'
  >('general');

  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [ocrLang, setOcrLang] = useState('eng');
  const [captureInterval, setCaptureInterval] = useState(1000);
  const [overlayOpacity, setOverlayOpacity] = useState(0.95);

  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Application Settings</h1>
          <div className="page-subtitle">Configure workspace preferences, overlay density, and scanner parameters</div>
        </div>
      </div>

      {/* 8 Sub-tabs Navigation */}
      <div className="tab-bar">
        {[
          { id: 'general', label: 'General' },
          { id: 'trading', label: 'Trading' },
          { id: 'overlay', label: 'Overlay' },
          { id: 'vision', label: 'Vision' },
          { id: 'ocr', label: 'OCR' },
          { id: 'appearance', label: 'Appearance' },
          { id: 'hotkeys', label: 'Hotkeys' },
          { id: 'developer', label: 'Developer' },
        ].map((t) => (
          <button
            key={t.id}
            className={`tab-item ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: GENERAL */}
      {activeTab === 'general' && (
        <div className="prop-card">
          <div className="prop-card-title" style={{ marginBottom: 16 }}>GENERAL PREFERENCES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="control-field">
              <span className="field-label">AUTO-START AI SCANNER ON LAUNCH</span>
              <input type="checkbox" defaultChecked style={{ accentColor: '#3b82f6' }} />
            </div>
            <div className="control-field">
              <span className="field-label">MINIMIZE TO SYSTEM TRAY ON CLOSE</span>
              <input type="checkbox" defaultChecked style={{ accentColor: '#3b82f6' }} />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRADING */}
      {activeTab === 'trading' && (
        <div className="prop-card">
          <div className="prop-card-title" style={{ marginBottom: 16 }}>TRADING PARAMETERS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="control-field">
              <span className="field-label">DEFAULT RECOMMENDED EXPIRY</span>
              <select className="field-select">
                <option value="1m">1 Minute</option>
                <option value="2m">2 Minutes</option>
                <option value="5m">5 Minutes</option>
              </select>
            </div>
            <div className="control-field">
              <span className="field-label">SIGNAL CONFIDENCE THRESHOLD (%)</span>
              <input type="number" defaultValue={55} className="field-input" style={{ width: 120 }} />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OVERLAY */}
      {activeTab === 'overlay' && (
        <div className="prop-card">
          <div className="prop-card-title" style={{ marginBottom: 16 }}>OVERLAY WINDOW PREFERENCES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="control-field">
              <span className="field-label">DEFAULT OVERLAY OPACITY</span>
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                style={{ width: 240, accentColor: '#3b82f6' }}
              />
              <span>{Math.round(overlayOpacity * 100)}%</span>
            </div>
            <div className="control-field">
              <span className="field-label">ACTIVE CANDLE AVOIDANCE SYSTEM</span>
              <input type="checkbox" defaultChecked style={{ accentColor: '#3b82f6' }} />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: VISION */}
      {activeTab === 'vision' && (
        <div className="prop-card">
          <div className="prop-card-title" style={{ marginBottom: 16 }}>VISION & CHART ENGINE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="control-field">
              <span className="field-label">CAPTURE CYCLE RATE (MS)</span>
              <input
                type="number"
                value={captureInterval}
                onChange={(e) => setCaptureInterval(parseInt(e.target.value))}
                className="field-input"
                style={{ width: 140 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: OCR */}
      {activeTab === 'ocr' && (
        <div className="prop-card">
          <div className="prop-card-title" style={{ marginBottom: 16 }}>OCR ENGINE SETTINGS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="control-field">
              <span className="field-label">RECOGNITION LANGUAGE</span>
              <select className="field-select" value={ocrLang} onChange={(e) => setOcrLang(e.target.value)}>
                <option value="eng">English (eng)</option>
                <option value="rus">Russian (rus)</option>
                <option value="spa">Spanish (spa)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: APPEARANCE */}
      {activeTab === 'appearance' && (
        <div className="prop-card">
          <div className="prop-card-title" style={{ marginBottom: 16 }}>UI THEME & ACCENTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="control-field">
              <span className="field-label">THEME MODE</span>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Prop-Firm Dark (Default)</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: HOTKEYS */}
      {activeTab === 'hotkeys' && (
        <div className="prop-card">
          <div className="prop-card-title" style={{ marginBottom: 16 }}>REGISTERED SYSTEM HOTKEYS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Start / Stop AI Analysis</span>
              <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>Ctrl + Shift + A</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Toggle Overlay Visibility</span>
              <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>Ctrl + Shift + O</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: DEVELOPER */}
      {activeTab === 'developer' && (
        <div className="prop-card">
          <div className="prop-card-title" style={{ marginBottom: 16 }}>DEVELOPER & DIAGNOSTICS MODE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="control-field">
              <span className="field-label">ENABLE DEVELOPER MODE</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  checked={isDeveloperMode}
                  onChange={(e) => setIsDeveloperMode(e.target.checked)}
                  style={{ accentColor: '#3b82f6' }}
                />
                <span style={{ fontSize: '0.8rem', color: isDeveloperMode ? '#00e676' : 'var(--text-muted)' }}>
                  {isDeveloperMode ? 'Developer Mode Active (Exposes raw math & vectors)' : 'Disabled (All debug metrics hidden by default)'}
                </span>
              </div>
            </div>

            {isDeveloperMode && (
              <div style={{ background: '#090d14', border: '1px solid #334155', borderRadius: 6, padding: 12, fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                [DEV DIAGNOSTICS ACTIVE]
                <br />
                Raw Bayesian posterior, feature vector streams, and OCR latency telemetry are now visible in Developer Tools.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
