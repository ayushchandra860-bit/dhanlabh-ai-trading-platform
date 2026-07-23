import React from 'react';

interface StatusIndicatorProps {
  status: 'ok' | 'error' | 'pending';
  label: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, label }) => (
  <div className="status-indicator">
    <div className={`status-dot ${status}`} />
    <span>{label}</span>
  </div>
);

export default StatusIndicator;