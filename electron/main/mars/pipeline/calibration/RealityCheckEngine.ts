import { TemporalContext } from '../context/ContextAggregator';
import { LoggerService } from '../../../LoggerService';
import { CalibrationConfigManager } from './CalibrationConfigManager';

export interface RealityCheckReport {
  passed: boolean;
  finalConfidence: number; // The strictly verified confidence (0-1)
  warnings: string[];
}

export class RealityCheckEngine {
  private config: CalibrationConfigManager;

  constructor(config: CalibrationConfigManager) {
    this.config = config;
  }
  
  /**
   * Final validation step before a trade recommendation is formulated.
   * If the reality check fails, MARS will refuse to recommend action.
   */
  public evaluate(computedConfidence: number, context: TemporalContext): RealityCheckReport {
    const warnings: string[] = [];
    let finalConfidence = computedConfidence;
    let passed = true;

    const profile = this.config.getActiveProfile();

    // 1. Minimum Viable Confidence Check
    const MINIMUM_THRESHOLD = profile.thresholds.minimumActionableConfidence; 
    if (finalConfidence < MINIMUM_THRESHOLD) {
      warnings.push(`Confidence (${finalConfidence.toFixed(2)}) is below the minimum action threshold of ${MINIMUM_THRESHOLD}`);
      passed = false;
    }

    // 2. Data Completeness Reality Check
    if (!context.isTimeframeAligned && context.timeframeAlignment.length < 2) {
      warnings.push('Operating on a single timeframe. Multi-timeframe alignment missing. (Warning Only)');
      finalConfidence = Math.max(0, finalConfidence - profile.thresholds.singleTimeframePenalty);
    }

    // 3. Volatility Reality Check
    if (context.marketRegime === 'UNKNOWN') {
      warnings.push('Market Regime is completely unknown. Trading is unsafe.');
      passed = false;
    }

    if (!passed) {
      LoggerService.warn(`[MARS RealityCheck] Evaluation failed. Warnings: ${warnings.join(' | ')}`);
    }

    return {
      passed,
      finalConfidence,
      warnings
    };
  }
}
