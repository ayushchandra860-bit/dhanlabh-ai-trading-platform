import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import OverlayV6 from './pages/OverlayV6';
import MainLayout from './layouts/MainLayout';
import LiveTrading from './pages/LiveTrading';
import TradeHistoryPage from './pages/TradeHistoryPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      {/* Floating Transparent Overlay */}
      <Route path="/overlay" element={<OverlayV6 />} />

      {/* Main Control Center Dashboard */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/trading" element={<LiveTrading />} />
        <Route path="/history" element={<TradeHistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
