import activeWin from 'active-win';

export class WindowTrackingService {
  private lastKnownBounds: any = null;
  private isScanning: boolean = false;

  public async getActiveWindowBounds() {
    try {
      const windowInfo = await activeWin();
      if (!windowInfo) return this.lastKnownBounds;

      const title = windowInfo.title.toLowerCase();
      const ownerName = windowInfo.owner.name.toLowerCase();

      // If focus shifts to Dhanlabh or Overlay window, DO NOT drop active scan
      const isSelf = 
        title.includes('dhanlabh') || 
        title.includes('mars') || 
        title.includes('overlay') ||
        ownerName.includes('electron');

      if (isSelf) {
        // Keep scanning using last known broker bounds
        return this.lastKnownBounds;
      }

      // Update bounds if user is on Olymp Trade or Broker screen
      this.lastKnownBounds = windowInfo.bounds;
      return windowInfo.bounds;
    } catch (error) {
      console.error('Window Tracking Error:', error);
      return this.lastKnownBounds;
    }
  }
}