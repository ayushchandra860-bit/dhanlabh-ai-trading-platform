import React from 'react';
import { X, Bell, Info, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

export interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warn' | 'action';
  title: string;
  message: string;
  time: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onClearAll: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onClearAll,
}) => {
  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={14} className="text-buy" />;
      case 'warn':
        return <AlertTriangle size={14} className="text-wait" />;
      case 'action':
        return <Zap size={14} style={{ color: '#38bdf8' }} />;
      default:
        return <Info size={14} style={{ color: '#94a3b8' }} />;
    }
  };

  return (
    <div className="nc-slideover-backdrop" onClick={onClose}>
      <div className="nc-slideover-panel" onClick={(e) => e.stopPropagation()}>
        <div className="nc-header">
          <div className="nc-title">
            <Bell size={16} />
            <span>NOTIFICATION CENTER</span>
            <span className="nc-count-badge">{notifications.length}</span>
          </div>

          <div className="nc-actions">
            {notifications.length > 0 && (
              <button className="nc-clear-btn" onClick={onClearAll}>
                Clear All
              </button>
            )}
            <button className="nc-close-btn" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="nc-body">
          {notifications.length === 0 ? (
            <div className="nc-empty">
              <Bell size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
              <span>No new system notifications</span>
            </div>
          ) : (
            notifications.map((item) => (
              <div key={item.id} className={`nc-item ${item.type}`}>
                <div className="nc-item-icon">{getIcon(item.type)}</div>
                <div className="nc-item-content">
                  <div className="nc-item-header">
                    <span className="nc-item-title">{item.title}</span>
                    <span className="nc-item-time">{item.time}</span>
                  </div>
                  <div className="nc-item-msg">{item.message}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
