import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  toggleOverlay: () => ipcRenderer.invoke('overlay:toggle'),
  setIgnoreMouse: (ignore: boolean) => ipcRenderer.send('set-ignore-mouse-events', ignore),
  onSignalUpdate: (callback: (data: any) => void) => {
    const handler = (_event: any, value: any) => callback(value);
    ipcRenderer.on('signal-update', handler);
    return () => {
      ipcRenderer.removeListener('signal-update', handler);
    };
  }
});