import { LoggerService } from '../LoggerService';
import { 
  ConfluenceData, TrendData, MarketStructureData, BosChochData, 
  LiquidityData, IndicatorData, LiveMarketObservation
} from '../vision';

export interface ConflictData {
  hasConflict: boolean;
  conflictSeverity: number; // 0-100
  conflictReasons: string[];
  adjustedProbabilityMultiplier: number; // e.g., 0.5 to halve the Bayesian probability
}

export class ConflictDetectionEngine {
  
  public detectConflicts(
    trendData: TrendData | null,
    marketStructureData: MarketStructureData | null,
    bosChochData: BosChochData | null,
    indicatorData: IndicatorData | null,
    liveObs: LiveMarketObservation | null,
    confluenceData: ConfluenceData | null
  ): ConflictData {
    LoggerService.info('ConflictDetectionEngine: Scanning for evidence divergences.');
    const reasons: string[] = [];
    let severity = 0;
    
    // Example Conflict 1: Bullish Trend but Bearish Momentum Indicators
    if (trendData?.currentTrend?.direction.includes('uptrend')) {
      const bearishMom = indicatorData?.momentum.filter(i => i.direction === 'bearish' && i.confidence > 70);
      if (bearishMom && bearishMom.length > 0) {
        severity += 40;
        reasons.push('Bullish Trend conflicts with Bearish Momentum');
      }
    }

    // Example Conflict 2: Bullish Structure but Live Observation shows 'Selling Pressure Increasing'
    if (marketStructureData?.currentStructure === 'bullish' && liveObs?.activeBehaviours.includes('Selling Pressure Increasing')) {
      severity += 50;
      reasons.push('Bullish Structure conflicts with Live Selling Pressure');
    }

    // Example Conflict 3: High Confluence Score but Weak Trend
    if (confluenceData && confluenceData.confluenceScore > 80 && trendData?.currentTrend?.strength && trendData.currentTrend.strength < 30) {
      severity += 30;
      reasons.push('High Setup Confidence but Weak Underlying Trend');
    }

    severity = Math.min(100, severity);

    let multiplier = 1.0;
    if (severity > 0) {
      multiplier = 1.0 - (severity / 100);
    }

    return {
      hasConflict: severity > 20,
      conflictSeverity: severity,
      conflictReasons: reasons,
      adjustedProbabilityMultiplier: multiplier
    };
  }
}
