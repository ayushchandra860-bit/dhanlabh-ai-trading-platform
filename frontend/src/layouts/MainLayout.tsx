import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from '../components/desktop/AppHeader';
import { AppSidebar } from '../components/desktop/AppSidebar';
import { NotificationCenter, NotificationItem } from '../components/desktop/NotificationCenter';
import { useVision } from '../hooks/useVision';
import { useWindowTracking } from '../../../shared/types/WindowTrackingContext';
import '../styles/MainLayout.css';

export const MainLayout: React.FC = () => {
  const { isActive: isAiActive } = useVision();
  const { windowState } = useWindowTracking();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: 'n1', type: 'info', title: 'System Boot', message: 'MARS PRO Desktop Environment initialised.', time: 'Just now' },
    { id: 'n2', type: 'success', title: 'Window Tracking', message: 'Connected to Olymp Trade Desktop window.', time: '1m ago' },
  ]);

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <div className="desktop-app-layout">
      {/* Header */}
      <AppHeader
        brokerName={windowState?.brokerName || 'Olymp Trade'}
        isAiActive={isAiActive}
        notificationCount={notifications.length}
        onToggleNotifications={() => setIsNotificationOpen((prev) => !prev)}
      />

      {/* Main Body */}
      <div className="app-body">
        <AppSidebar />

        <main className="desktop-workspace">
          <Outlet />
        </main>
      </div>

      {/* Slide-Over Notification Center */}
      <NotificationCenter
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        onClearAll={clearAllNotifications}
      />
    </div>
  );
};

export default MainLayout;