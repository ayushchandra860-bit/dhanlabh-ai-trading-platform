import React from 'react';
import '../styles/ControlPanel.css';

const OverlaySettings: React.FC = () => {
  return (
    <div className="cp-page">
      <h1 className="cp-title">Overlay Settings</h1>
      <div className="cp-card">
        <h2 className="cp-card-title">Visibility Options</h2>
        <div className="cp-status-row">
          <p>Overlay visibility settings and manual offsets go here.</p>
        </div>
      </div>
    </div>
  );
};

export default OverlaySettings;
