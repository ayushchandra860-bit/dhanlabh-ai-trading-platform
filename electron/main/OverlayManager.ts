import { BrowserWindow, screen, app } from 'electron';
import path from 'path';

export class OverlayManager {
  private static instance: OverlayManager;
  private overlayWindow: BrowserWindow | null = null;

  private constructor() {}

  public static getInstance(): OverlayManager {
    if (!OverlayManager.instance) {
      OverlayManager.instance = new OverlayManager();
    }
    return OverlayManager.instance;
  }

  public createOrGetOverlay(): BrowserWindow {
    // Prevent duplicate window spawning
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      if (!this.overlayWindow.isVisible()) {
        this.overlayWindow.show();
      }
      return this.overlayWindow;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height, x, y } = primaryDisplay.bounds;

    this.overlayWindow = new BrowserWindow({
      width,
      height,
      x,
      y,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      focusable: false,
      hasShadow: false,
      show: true,
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,
      },
    });

    // Force Windows OS overlay z-index
    this.overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    
    // Enable mouse click-through to trade directly on broker
    this.overlayWindow.setIgnoreMouseEvents(true, { forward: true });

    const isDev = !app.isPackaged;
    if (isDev) {
      this.overlayWindow.loadURL('http://localhost:5173/#/overlay');
    } else {
      const indexPath = path.join(__dirname, '../frontend/index.html');
      this.overlayWindow.loadFile(indexPath, { hash: '/overlay' });
    }

    this.overlayWindow.on('closed', () => {
      this.overlayWindow = null;
    });

    return this.overlayWindow;
  }

  public toggleOverlay(): void {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) {
      this.createOrGetOverlay();
      return;
    }

    if (this.overlayWindow.isVisible()) {
      this.overlayWindow.hide();
    } else {
      this.overlayWindow.show();
    }
  }
}

export const overlayManager = OverlayManager.getInstance();