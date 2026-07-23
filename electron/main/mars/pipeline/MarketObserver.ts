import { eventBus } from '../core/MarsEventBus';
import { MarsEventTypes } from '../interfaces/IEvents';
import { VisionResult } from '../../vision';

export class MarketObserver {
  private lastStructTime = 0;
  private debounceMs = 2000; // Wait 2s to debounce structural spam

  /**
   * Called by V1.0 pipeline. Does not block.
   */
  public observe(visionResult: VisionResult): void {
    const now = Date.now();
    
    // Simple debounce aggregation: We don't need 10 events per second.
    if (now - this.lastStructTime < this.debounceMs) {
      return;
    }
    
    // Detect structural events from vision Result (e.g. liquidity grab, strong momentum, bos)
    const hasStructureEvent = 
      visionResult.marketStructureData?.currentStructure !== undefined ||
      visionResult.liquidityData?.sweepHistory && visionResult.liquidityData.sweepHistory.length > 0 ||
      (visionResult.momentumData && visionResult.momentumData.strength > 70);

    if (hasStructureEvent) {
      this.lastStructTime = now;
      eventBus.publish(MarsEventTypes.OBSERVATION_CREATED, {
        timestamp: now,
        visionResult,
        detectedEvents: [
          visionResult.marketStructureData?.currentStructure,
          ...(visionResult.liquidityData?.sweepHistory || []).map((s: any) => s.type),
          visionResult.momentumData?.strength && visionResult.momentumData.strength > 70 ? 'STRONG_BULL_MOMENTUM' : (visionResult.momentumData?.strength && visionResult.momentumData.strength < -70 ? 'STRONG_BEAR_MOMENTUM' : null)
        ].filter(Boolean)
      });
    }
  }
}

export const marketObserver = new MarketObserver();
