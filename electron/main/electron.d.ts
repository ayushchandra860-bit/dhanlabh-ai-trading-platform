import { WindowState } from '@shared/types/window';

export interface IElectronAPI {
  windowTracking: {
    getCurrentState: () => Promise<WindowState>;
    onStateUpdate: (callback: (state: WindowState) => void) => () => void;
    getAvailableWindows: () => Promise<any[]>;
    setManualOverride: (id: number | null) => void;
  };
  ai: {
    start: () => Promise<{ state: string; running: boolean; updatedAt: number }>;
    stop: () => Promise<{ state: string; running: boolean; updatedAt: number }>;
    status: () => Promise<{ state: string; running: boolean; updatedAt: number }>;
    onStatusChange: (callback: (status: { state: string; running: boolean; updatedAt: number }) => void) => () => void;
  };
  vision: {
    start: () => Promise<{ state: string; running: boolean; updatedAt: number }>;
    stop: () => Promise<{ state: string; running: boolean; updatedAt: number }>;
    onResultUpdate: (callback: (result: any) => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
