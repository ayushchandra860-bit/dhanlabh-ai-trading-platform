import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Bell, Settings as SettingsIcon } from 'lucide-react';

interface AppHeaderProps {
  brokerName: string;
  isAiActive: boolean;
  notificationCount: number;
  onToggleNotifications: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  brokerName,
  isAiActive,
  notificationCount,
  onToggleNotifications,
}) => {
  const navigate = useNavigate();

  return (
    <header className="app-header">
      {/* 1. LOGO */}
      <div className="header-brand" onClick={() => navigate('/dashboard')}>
        <Zap size={18} className="brand-icon" />
        <span className="brand-name">MARS</span>
        <span className="brand-tag">PRO</span>
      </div>

      <div className="header-divider" />

      {/* 2. BROKER CONNECTION STATUS */}
      <div className="header-item">
        <span className="item-label">BROKER</span>
        <div className="item-badge broker">
          <span className="status-dot online"></span>
          <span>{brokerName || 'Olymp Trade'}</span>
        </div>
      </div>

      <div className="header-spacer" />

      {/* 3. AI STATUS PILL */}
      <div className="header-item">
        <div className={`ai-status-pill ${isAiActive ? 'active' : 'idle'}`}>
          <span className="pulse-dot"></span>
          <span>{isAiActive ? 'AI RUNNING' : 'AI STOPPED'}</span>
        </div>
      </div>

      {/* 4. NOTIFICATION BELL */}
      <button className="header-icon-btn" onClick={onToggleNotifications} title="Notification Center">
        <Bell size={16} />
        {notificationCount > 0 && <span className="bell-badge">{notificationCount}</span>}
      </button>

      {/* 5. SETTINGS SHORTCUT */}
      <button className="header-icon-btn" onClick={() => navigate('/settings')} title="Settings">
        <SettingsIcon size={16} />
      </button>
    </header>
  );
};
