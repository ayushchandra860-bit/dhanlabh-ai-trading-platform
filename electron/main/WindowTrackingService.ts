import { screen } from 'electron';
import { LoggerService } from './LoggerService';
import { WindowState } from '../../shared/types/window';
import activeWindow = require('active-win');

export class WindowTrackingService {
  private timer: NodeJS.Timeout | null = null;
  private isTracking = false;
  private lastState: WindowState = { isFound: false, isFocused: false, brokerName: 'OlympTrade (Exclusive)' };
  private subscribers: ((state: WindowState) => void)[] = [];

  constructor(private logger: typeof LoggerService = LoggerService) {}

  public start(): void {
    if (this.isTracking) return;
    this.isTracking = true;
    this.timer = setInterval(() => this.checkWindowState(), 1000);
    this.logger.info('WindowTrackingService started (Olymp Trade Exclusive Mode)');
  }

  public stop(): void {
    if (!this.isTracking) return;
    this.isTracking = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.logger.info('WindowTrackingService stopped');
  }

  public subscribe(callback: (state: WindowState) => void) {
    this.subscribers.push(callback);
  }

  public getCurrentState(): WindowState {
    return this.lastState;
  }

  public getAvailableWindows() {
    return [];
  }

  public setManualOverride(id: number | null) {
    this.logger.info('Manual override ignored in Olymp Trade Exclusive Mode');
  }

  public async getActiveWindowBounds() {
    return this.lastState.position ? {
      x: this.lastState.position.x,
      y: this.lastState.position.y,
      width: this.lastState.size?.width || 0,
      height: this.lastState.size?.height || 0,
    } : null;
  }

  private async checkWindowState() {
    try {
      const activeWin = await activeWindow();
      if (!activeWin) return;
      
      const title = `${activeWin.owner?.name ?? ''} ${activeWin.title ?? ''}`.toLowerCase();
      const isOlympTrade = 
        title.includes('olymp') || 
        title.includes('olymptrade') || 
        title.includes('trading platform');

      if (isOlympTrade) {
        const primaryDisplay = screen.getPrimaryDisplay();
        const scaleFactor = primaryDisplay.scaleFactor || 1;

        const newState: WindowState = {
          isFound: true,
          isFocused: true,
          brokerName: 'OlympTrade (Exclusive)',
          position: {
            x: Math.round(activeWin.bounds.x * scaleFactor),
            y: Math.round(activeWin.bounds.y * scaleFactor),
          },
          size: {
            width: Math.round(activeWin.bounds.width * scaleFactor),
            height: Math.round(activeWin.bounds.height * scaleFactor),
          },
          scaleFactor,
        };

        if (JSON.stringify(newState) !== JSON.stringify(this.lastState)) {
          this.lastState = newState;
          this.subscribers.forEach(cb => cb(newState));
        }
      } else if (this.lastState.isFound) {
        // Save exact screen coordinates and NEVER reset bounds even when switching windows
        return;
      } else {
        // Fallback default full display bounds if Olymp Trade active window scan is pending
        const primaryDisplay = screen.getPrimaryDisplay();
        const scaleFactor = primaryDisplay.scaleFactor || 1;
        const bounds = primaryDisplay.bounds;

        const newState: WindowState = {
          isFound: true,
          isFocused: true,
          brokerName: 'OlympTrade (Exclusive)',
          position: { x: 0, y: 0 },
          size: {
            width: Math.round(bounds.width * scaleFactor),
            height: Math.round(bounds.height * scaleFactor),
          },
          scaleFactor,
        };
        this.lastState = newState;
        this.subscribers.forEach(cb => cb(newState));
      }
    } catch (e) {
      this.logger.error('Error tracking window state: ' + e);
    }
  }
}