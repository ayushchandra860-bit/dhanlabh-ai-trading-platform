import { app, BrowserWindow, ipcMain, powerSaveBlocker } from 'electron';
import path from 'path';
import { overlayManager } from './OverlayManager';

// Enable transparent visuals on Windows DWM
app.commandLine.appendSwitch('enable-transparent-visuals');

let mainWindow: BrowserWindow | null = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'DhanLabh AI V2',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Prevents background freezing
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/index.html'));
  }
}

app.whenReady().then(() => {
  // Prevent Windows from suspending timers or background tasks during scan
  powerSaveBlocker.start('prevent-app-suspension');

  createMainWindow();

  // Handle Overlay Toggling
  ipcMain.handle('overlay:toggle', () => {
    overlayManager.toggleOverlay();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});