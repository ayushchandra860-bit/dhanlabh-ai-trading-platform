import React from 'react';
import { Sun, Moon, Activity } from 'lucide-react';
import { useTheme } from './ThemeContext';
import StatusIndicator from './StatusIndicator';
import Clock from './Clock';
import '../styles/TopBar.css';

interface TopBarProps {
  otConnected: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ otConnected }) => {
  const { theme, setTheme } = useTheme();
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <header className="top-bar">
      <div className="logo-section">
        <Activity size={24} className="app-logo" />
        <h1>DhanLabh AI</h1>
      </div>
      <div className="status-section">
        <StatusIndicator status={otConnected ? 'ok' : 'pending'} label="Olymp Trade" />
        <StatusIndicator status="ok" label="Backend" />
        <StatusIndicator status="ok" label="Electron" />
        <StatusIndicator status="ok" label="Database" />
      </div>
      <div className="controls-section">
        <Clock />
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};

export default TopBar;