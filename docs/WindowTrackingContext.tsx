import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { WindowState } from '@shared/types/window';

const initialState: WindowState = {
  isFound: false,
  isActive: false,
};

export const WindowTrackingContext = createContext<WindowState>(initialState);

export const WindowTrackingProvider = ({ children }: { children: ReactNode }) => {
  const [windowState, setWindowState] = useState<WindowState>(initialState);

  useEffect(() => {
    let isMounted = true;

    // Get initial state once
    window.electronAPI.windowTracking.getCurrentState().then((initial) => {
      if (isMounted) setWindowState(initial);
    });

    // Subscribe to live updates
    const unsubscribe = window.electronAPI.windowTracking.onUpdate((state) => {
      if (isMounted) setWindowState(state);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return <WindowTrackingContext.Provider value={windowState}>{children}</WindowTrackingContext.Provider>;
};