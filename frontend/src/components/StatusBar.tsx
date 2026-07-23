import React from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/StatusBar.css';

interface StatusBarProps {
  otConnected: boolean;
}

const StatusBar: React.FC<StatusBarProps> = ({ otConnected }) => {
  const location = useLocation();
  const path = location.pathname.split('/').pop() || 'dashboard';
  const moduleName = path
    .split('-')
    .map(word => word === 'ai' ? 'AI' : word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="status-bar">
      <span>Module: {moduleName}</span>
      <span className="separator">|</span>
      <span>Build: v{process.env.npm_package_version}</span>
      <span className="separator">|</span>
      <span>Connection: {otConnected ? 'Active' : 'Inactive'}</span>
    </div>
  );
};

export default StatusBar;