import { ipcRenderer, contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  windowTracking: {
    getCurrentState: () => ipcRenderer.invoke('window-tracking:get-current-state'),
    onStateUpdate: (callback: (state: unknown) => void) => {
      const sub = (_event: Electron.IpcRendererEvent, state: unknown) => callback(state);
      ipcRenderer.on('window-tracking:state-update', sub);
      return () => ipcRenderer.removeListener('window-tracking:state-update', sub);
},
    getAvailableWindows: () => ipcRenderer.invoke('window-tracking:get-available-windows'),
    setManualOverride: (id: number | null) => ipcRenderer.send('window-tracking:set-manual-override', id),
},

  vision: {
    start: () => ipcRenderer.invoke('vision:start'),
    stop:  () => ipcRenderer.invoke('vision:stop'),
    onResultUpdate: (callback: (result: any) => void) => {
      const sub = (_event: Electron.IpcRendererEvent, result: any) => callback(result);
      ipcRenderer.on('vision:result-update', sub);
      return () => ipcRenderer.removeListener('vision:result-update', sub);
},
},

  settings: {
    get: ()              => ipcRenderer.invoke('settings:get'),
    set: (s: any)        => ipcRenderer.invoke('settings:set', s),
},

  ai: {
    start:  ()           => ipcRenderer.invoke('ai:start'),
    stop:   ()           => ipcRenderer.invoke('ai:stop'),
    status: ()           => ipcRenderer.invoke('ai:status'),
    onStatusChange: (callback: (status: any) => void) => {
      const sub = (_e: Electron.IpcRendererEvent, status: any) => callback(status);
      ipcRenderer.on('ai:status-change', sub);
      return () => ipcRenderer.removeListener('ai:status-change', sub);
},
},

  logs: {
    get:   ()            => ipcRenderer.invoke('logs:get'),
    clear: ()            => ipcRenderer.invoke('logs:clear'),
    onUpdate: (callback: (line: string) => void) => {
      const sub = (_e: Electron.IpcRendererEvent, line: string) => callback(line);
      ipcRenderer.on('logs:line', sub);
      return () => ipcRenderer.removeListener('logs:line', sub);
},
},

  overlay: {
    getState:       ()           => ipcRenderer.invoke('overlay:get-state'),
    toggle:         ()           => ipcRenderer.invoke('overlay:toggle'),
    enable:         ()           => ipcRenderer.invoke('overlay:enable'),
    setInteractive: (on: boolean) => ipcRenderer.invoke('overlay:set-interactive', on),
    setMode:        (mode: string) => ipcRenderer.invoke('overlay:set-mode', mode),
    getMode:        ()           => ipcRenderer.invoke('overlay:get-mode'),
    setPanelLock:   (panelId: string, locked: boolean, position: any) =>
                                    ipcRenderer.invoke('overlay:set-panel-lock', panelId, locked, position),
    getPanelLocks:  ()           => ipcRenderer.invoke('overlay:get-panel-locks'),

    // Overlay renderer subscriptions
    onVisionResult: (callback: (result: any) => void) => {
      const sub = (_e: Electron.IpcRendererEvent, result: any) => callback(result);
      ipcRenderer.on('overlay:vision-result', sub);
      return () => ipcRenderer.removeListener('overlay:vision-result', sub);
},
    onWindowState: (callback: (state: any) => void) => {
      const sub = (_e: Electron.IpcRendererEvent, state: any) => callback(state);
      ipcRenderer.on('overlay:window-state', sub);
      return () => ipcRenderer.removeListener('overlay:window-state', sub);
    },
    onModeChange: (callback: (mode: string) => void) => {
      const sub = (_e: Electron.IpcRendererEvent, mode: string) => callback(mode);
      ipcRenderer.on('overlay:mode-change', sub);
      return () => ipcRenderer.removeListener('overlay:mode-change', sub);
},
},

  broker: {
    getActive: () => ipcRenderer.invoke('broker:get-active'),
},

  capture: {
    getAll:         ()                          => ipcRenderer.invoke('capture:get-all'),
    updateResult:   (id: string, result: string) => ipcRenderer.invoke('capture:update-result', id, result),
    onNewCapture:   (callback: (capture: any) => void) => {
      const sub = (_e: Electron.IpcRendererEvent, capture: any) => callback(capture);
      ipcRenderer.on('capture:new', sub);
      return () => ipcRenderer.removeListener('capture:new', sub);
    },
  },
});
