import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WindowState } from '@shared/types/window';

interface WindowTrackingContextType {
  windowState: WindowState;
}

export const WindowTrackingContext = createContext<WindowTrackingContextType | null>(null);

interface WindowTrackingProviderProps {
  children: ReactNode;
}

const initialState: WindowState = {
  isFound: false,
  isFocused: false,
};

export const WindowTrackingProvider = ({ children }: WindowTrackingProviderProps) => {
  const [windowState, setWindowState] = useState<WindowState>(initialState);

  useEffect(() => {
    const handleStateUpdate = (state: WindowState) => {
      setWindowState(state);
    };

    let unsubscribe: (() => void) | undefined;

    if (window.electronAPI && window.electronAPI.windowTracking) {
      window.electronAPI.windowTracking.getCurrentState().then((initialState: WindowState) => {
        if (initialState) {
          setWindowState(initialState);
        }
      });
      unsubscribe = window.electronAPI.windowTracking.onStateUpdate(handleStateUpdate);
    }

    return () => {
      unsubscribe?.();
    };
  }, []);

  return <WindowTrackingContext.Provider value={{ windowState }}>{children}</WindowTrackingContext.Provider>;
};

export const useWindowTracking = (): WindowTrackingContextType => {
  const context = useContext(WindowTrackingContext);
  if (!context) {
    throw new Error('useWindowTracking must be used within a WindowTrackingProvider');
  }
  return context;
};