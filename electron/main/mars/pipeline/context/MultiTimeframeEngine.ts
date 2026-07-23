import { VisionResult } from '../../../vision';
import { LoggerService } from '../../../LoggerService';

export interface TimeframeSnapshot {
  timeframe: string;
  timestamp: number;
  marketStructure: string;
  trend: string;
  volatility: string;
}

export class MultiTimeframeEngine {
  private cache: Map<string, TimeframeSnapshot> = new Map();
  private readonly CACHE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes max TTL for a timeframe view

  /**
   * Caches the latest observation for a specific timeframe.
   */
  public registerObservation(visionResult: VisionResult): void {
    const tf = visionResult.marketState?.timeframe || 'UNKNOWN';
    if (tf === 'UNKNOWN') return;

    this.cache.set(tf, {
      timeframe: tf,
      timestamp: Date.now(),
      marketStructure: visionResult.marketStructureData?.currentStructure || 'undefined',
      trend: visionResult.trendData?.currentTrend?.direction || 'undefined',
      volatility: visionResult.volatilityData?.state || 'Medium'
    });
  }

  /**
   * Retrieves the unified Multi-Timeframe (MTF) alignment context.
   */
  public getAlignment(): TimeframeSnapshot[] {
    const now = Date.now();
    const validSnapshots: TimeframeSnapshot[] = [];

    for (const [tf, snapshot] of this.cache.entries()) {
      if (now - snapshot.timestamp <= this.CACHE_EXPIRY_MS) {
        validSnapshots.push(snapshot);
      } else {
        // Evict stale timeframe data
        this.cache.delete(tf);
        LoggerService.info(`[MARS MTF] Evicted stale timeframe cache for ${tf}`);
      }
    }

    return validSnapshots;
  }
}
