import activeWin from 'active-win';
import { WindowState } from '../../../../shared/types/window';

const deepEqual = (obj1: any, obj2: any): boolean => {
  // A simple, dependency-free deep comparison for the expected state object.
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};

export class WindowTrackingService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private currentState: WindowState = { isFound: false, isActive: false };
  private readonly pollRate = 2000; // ms
  private changeCallback: (state: WindowState) => void;

  constructor(changeCallback: (state: WindowState) => void) {
    this.changeCallback = changeCallback;
    this.startPolling();
  }

  private async poll() {
    let newState: WindowState;
    try {
      const activeWindow = await activeWin();
      if (activeWindow && (activeWindow.owner.name.includes('Olymp Trade') || activeWindow.title.includes('Olymp Trade'))) {
        newState = {
          isFound: true,
          isActive: true,
          position: { x: activeWindow.bounds.x, y: activeWindow.bounds.y },
          size: { width: activeWindow.bounds.width, height: activeWindow.bounds.height },
        };
      } else {
        newState = { isFound: false, isActive: false };
      }
    } catch (error) {
      console.error('[WindowTrackingService] Error polling active window:', error);
      newState = { isFound: false, isActive: false };
    }

    if (!deepEqual(this.currentState, newState)) {
      this.currentState = newState;
      this.changeCallback(this.currentState);
    }
  }

  private startPolling() {
    if (this.pollingInterval) return;
    this.poll(); // Run once immediately on start
    this.pollingInterval = setInterval(() => this.poll(), this.pollRate);
  }

  public stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  public getCurrentState(): WindowState {
    return this.currentState;
  }
}