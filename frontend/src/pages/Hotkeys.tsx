import React from 'react';
import '../styles/ControlPanel.css';

const Hotkeys: React.FC = () => {
  return (
    <div className="cp-page">
      <h1 className="cp-title">Keyboard Shortcuts</h1>

      <div className="cp-card">
        <h2 className="cp-card-title">Global Hotkeys</h2>
        <div className="cp-hotkey-row">
          <span>Start / Stop AI Engine</span>
          <div className="cp-key">
            <span className="cp-key-cap">Ctrl</span>+
            <span className="cp-key-cap">Shift</span>+
            <span className="cp-key-cap">A</span>
          </div>
        </div>
        <div className="cp-hotkey-row">
          <span>Show / Hide Overlay</span>
          <div className="cp-key">
            <span className="cp-key-cap">Ctrl</span>+
            <span className="cp-key-cap">Shift</span>+
            <span className="cp-key-cap">O</span>
          </div>
        </div>
        <div className="cp-hotkey-row">
          <span>Cycle Overlay Mode</span>
          <div className="cp-key">
            <span className="cp-key-cap">Ctrl</span>+
            <span className="cp-key-cap">Shift</span>+
            <span className="cp-key-cap">M</span>
          </div>
        </div>
        <div className="cp-hotkey-row">
          <span>Toggle Debug Mode</span>
          <div className="cp-key">
            <span className="cp-key-cap">Ctrl</span>+
            <span className="cp-key-cap">Shift</span>+
            <span className="cp-key-cap">D</span>
          </div>
        </div>
      </div>

      <p style={{ color: '#8b949e', fontSize: '0.8rem', textAlign: 'center', marginTop: '24px' }}>
        Hotkey customization available in a future update.
      </p>
    </div>
  );
};

export default Hotkeys;
