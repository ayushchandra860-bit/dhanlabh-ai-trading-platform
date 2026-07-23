import { MarketRegime } from './RegimeClassifier';
import { TimeframeSnapshot } from './MultiTimeframeEngine';

export interface TemporalContext {
  id: string; // Unique ID for this observation payload
  timestamp: number;
  marketRegime: MarketRegime;
  timeframeAlignment: TimeframeSnapshot[];
  featureVector: number[]; // The normalized vector from Domain 3
  isTimeframeAligned: boolean; // True if HTF (Higher Timeframe) agrees with current TF
}

export class ContextAggregator {
  
  /**
   * Bundles mathematical features, regime classification, and cross-timeframe data
   * into the ultimate payload that is passed into the Cognitive Reasoning Engines (Domain 5).
   */
  public aggregate(
    featureVector: number[], 
    regime: MarketRegime, 
    mtfContext: TimeframeSnapshot[]
  ): TemporalContext {
    
    return {
      id: `CTX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      marketRegime: regime,
      timeframeAlignment: mtfContext,
      featureVector,
      isTimeframeAligned: this.checkAlignment(mtfContext)
    };
  }

  private checkAlignment(mtfContext: TimeframeSnapshot[]): boolean {
    if (mtfContext.length < 2) return false;
    
    // Simplistic check: If all cached timeframes share the same Trend direction, we have alignment.
    const firstTrend = mtfContext[0].trend;
    if (firstTrend === 'undefined') return false;

    for (let i = 1; i < mtfContext.length; i++) {
      if (mtfContext[i].trend !== firstTrend) {
        return false;
      }
    }
    return true;
  }
}
