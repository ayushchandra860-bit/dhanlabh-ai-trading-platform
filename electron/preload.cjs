const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dhanlabhDesktop', {
  listSources: () => ipcRenderer.invoke('sources:list'),
  captureFrame: (sourceId) => ipcRenderer.invoke('capture:frame', sourceId),
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (config) => ipcRenderer.invoke('config:set', config),
  listHistory: () => ipcRenderer.invoke('history:list'),
  saveHistory: (payload) => ipcRenderer.invoke('history:save', payload),
  showOverlay: () => ipcRenderer.invoke('overlay:show'),
  hideOverlay: () => ipcRenderer.invoke('overlay:hide'),
  updateOverlay: (analysis) => ipcRenderer.invoke('overlay:update', analysis),
  updateOverlaySettings: (overlay) => ipcRenderer.invoke('overlay:settings', overlay),
  onOverlayAnalysis: (callback) => {
    const listener = (_event, analysis) => callback(analysis);
    ipcRenderer.on('overlay:analysis', listener);
    return () => ipcRenderer.removeListener('overlay:analysis', listener);
  },
  onOverlaySettings: (callback) => {
    const listener = (_event, settings) => callback(settings);
    ipcRenderer.on('overlay:settings', listener);
    return () => ipcRenderer.removeListener('overlay:settings', listener);
  },
  exit: () => ipcRenderer.invoke('app:exit')
});
