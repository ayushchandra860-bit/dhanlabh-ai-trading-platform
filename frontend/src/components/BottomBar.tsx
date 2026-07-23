import React from 'react';

import { Terminal } from 'lucide-react';
import StatusBar from './StatusBar';

interface BottomBarProps {
  otStatus: { connected: boolean };
}

const BottomBar: React.FC<BottomBarProps> = ({ otStatus }) => {
  return (
    <footer className="bottom-bar">
      <div className="log-section">
        <Terminal size={16} />
        <span>Application Logs</span>
      </div>
      <StatusBar otConnected={otStatus.connected} />
      <div className="status-section">
        <span className={`ot-status ${otStatus.connected ? 'connected' : 'disconnected'}`}>
          Olymp Trade: {otStatus.connected ? 'Connected' : 'Disconnected'}
        </span>
        <span>Status: </span>
        <span className="status-ready">Ready</span>
      </div>
    </footer>
  );
};

export default BottomBar;
