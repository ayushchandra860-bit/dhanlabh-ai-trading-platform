import React from 'react';
import ReactDOM from 'react-dom/client';
// HashRouter is required for Electron.
// BrowserRouter reads window.location.pathname, which under file:// is the full
// filesystem path (e.g. /C:/Users/.../index.html). This never matches <Route path="/">.
// HashRouter reads the # fragment, which allows multiple windows to load different routes!
import { HashRouter } from 'react-router-dom';
import App from './pages/App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { ThemeProvider } from './components/ThemeProvider.tsx';
import { WindowTrackingProvider } from '../../shared/types/WindowTrackingContext.tsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <ThemeProvider>
        <WindowTrackingProvider>
          <ErrorBoundary><App /></ErrorBoundary>
        </WindowTrackingProvider>
      </ThemeProvider>
    </HashRouter>
  </React.StrictMode>,
);
