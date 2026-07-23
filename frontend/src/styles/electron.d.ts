export {};

import { WindowState } from '../../../shared/types/window'; // Corrected relative path for WindowState

export interface IWindowTrackingAPI {
  getCurrentState(): Promise<WindowState>;
  onStateUpdate(callback: (state: WindowState) => void): () => void;
  getAvailableWindows(): Promise<any[]>;
  setManualOverride(id: number | null): void;
}

export interface IElectronAPI {
  windowTracking: IWindowTrackingAPI;
  vision: {
    start(): Promise<{ state: string; running: boolean; updatedAt: number }>;
    stop(): Promise<{ state: string; running: boolean; updatedAt: number }>;
    onResultUpdate(callback: (result: any) => void): () => void;
  };
  ai: {
    start(): Promise<{ state: string; running: boolean; updatedAt: number }>;
    stop(): Promise<{ state: string; running: boolean; updatedAt: number }>;
    status(): Promise<{ state: string; running: boolean; updatedAt: number }>;
    onStatusChange(callback: (status: { state: string; running: boolean; updatedAt: number }) => void): () => void;
  };
  logs: {
    get(): Promise<string[]>;
    clear(): Promise<boolean>;
    onUpdate(callback: (line: string) => void): () => void;
  };
  settings: {
    get(): Promise<any>;
    set(settings: any): Promise<boolean>;
  };
  overlay: {
    getState(): Promise<any>;
    setInteractive(on: boolean): Promise<boolean>;
    setMode(mode: string): Promise<boolean>;
    getMode(): Promise<string>;
    getPanelLocks(): Promise<any>;
    setPanelLock(panelId: string, locked: boolean, position: any): Promise<any>;
    onVisionResult(callback: (result: any) => void): () => void;
    onWindowState(callback: (state: any) => void): () => void;

    onModeChange(callback: (mode: string) => void): () => void;
  };
  broker: {
    getActive(): Promise<any>;
  };
  capture: {
    getAll(): Promise<any[]>;
    updateResult(id: string, result: string): Promise<boolean>;
    onNewCapture(callback: (capture: any) => void): () => void;
  };
}

declare global {
  interface Window {
    electronAPI: IElectronAPI; // Exposed as electronAPI as per ADR-001
  }
}
