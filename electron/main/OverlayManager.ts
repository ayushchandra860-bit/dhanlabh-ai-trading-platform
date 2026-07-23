import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';

export class OverlayManager {
  private overlayWindow: BrowserWindow | null = null;
  private isAIActive = false;

  constructor() {
    ipcMain.on('set-ignore-mouse-events', (event, ignore: boolean) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        if (ignore) {
          win.setIgnoreMouseEvents(true, { forward: true });
          try { win.blur(); } catch (e) {}
        } else {
          win.setIgnoreMouseEvents(false);
        }
      }
    });
  }

  public isReady(): boolean {
    return this.overlayWindow !== null && !this.overlayWindow.isDestroyed() && this.overlayWindow.isVisible();
  }

  public setAIActive(active: boolean) {
    this.isAIActive = active;
  }

  public setInteractive(on: boolean): void {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return;
    if (on) {
      this.overlayWindow.setIgnoreMouseEvents(false);
    } else {
      this.overlayWindow.setIgnoreMouseEvents(true, { forward: true });
      try { this.overlayWindow.blur(); } catch (e) {}
    }
  }

  public createOrGetOverlay(): BrowserWindow {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      return this.overlayWindow;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;

    const preloadPath = path.join(__dirname, '../preload/preload.js');

    this.overlayWindow = new BrowserWindow({
      width,
      height,
      x: 0,
      y: 0,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      focusable: false,
      hasShadow: false,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: preloadPath,
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,
      },
    });

    this.overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    this.overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.overlayWindow.setIgnoreMouseEvents(true, { forward: true });

    if (this.overlayWindow.webContents) {
      this.overlayWindow.webContents.setBackgroundThrottling(false);
    }

    const distPath = path.join(__dirname, '../../../dist/frontend/index.html');
    const isDev = !!process.env.VITE_DEV_SERVER_URL && process.env.NODE_ENV === 'development';

    if (isDev) {
      const devPort = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
      this.overlayWindow.loadURL(`${devPort}/#/overlay`).catch(() => {
        this.overlayWindow?.loadFile(distPath, { hash: '/overlay' });
      });
    } else {
      this.overlayWindow.loadFile(distPath, { hash: '/overlay' });
    }

    this.overlayWindow.on('closed', () => {
      this.overlayWindow = null;
    });

    return this.overlayWindow;
  }

  public sendVisionResult(result: any) {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed() && this.overlayWindow.webContents) {
      this.overlayWindow.webContents.send('signal-update', result);
      this.overlayWindow.webContents.send('overlay:vision-result', result);
    }
  }

  public onWindowStateUpdate(state: any) {
    this.sendWindowState(state);
  }

  public sendWindowState(state: any) {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed() && this.overlayWindow.webContents) {
      this.overlayWindow.webContents.send('overlay:window-state', state);
    }
  }

  public sendModeChange(mode: string) {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed() && this.overlayWindow.webContents) {
      this.overlayWindow.webContents.send('overlay:mode-change', mode);
    }
  }

  public toggleOverlay() {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      if (this.overlayWindow.isVisible()) {
        this.overlayWindow.hide();
      } else {
        this.overlayWindow.show();
      }
    } else {
      this.createOrGetOverlay();
    }
  }

  public destroy() {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.close();
    }
    this.overlayWindow = null;
  }
}

export const overlayManager = new OverlayManager();