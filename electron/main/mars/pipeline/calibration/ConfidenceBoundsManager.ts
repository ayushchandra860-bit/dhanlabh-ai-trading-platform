import { TemporalContext } from '../context/ContextAggregator';
import { LoggerService } from '../../../LoggerService';
import { CalibrationConfigManager } from './CalibrationConfigManager';

export class ConfidenceBoundsManager {
  private config: CalibrationConfigManager;

  constructor(config: CalibrationConfigManager) {
    this.config = config;
  }

  /**
   * Enforces global, unbreakable bounds on any computed confidence score.
   */
  public enforceBounds(posteriorConfidence: number, context: TemporalContext): number {
    let calibrated = posteriorConfidence;
    const profile = this.config.getActiveProfile();

    // 1. Cap Hubris (Never allow 100% certainty)
    const MAX_CONFIDENCE_CAP = profile.thresholds.maxConfidenceCap;
    if (calibrated > MAX_CONFIDENCE_CAP) {
      LoggerService.info(`[MARS Bounds] Capping hubris. Reduced confidence from ${calibrated} to ${MAX_CONFIDENCE_CAP}`);
      calibrated = MAX_CONFIDENCE_CAP;
    }

    // 2. Regime-based Penalties
    if (context.marketRegime === 'CHAOS_TRANSITION') {
      // In chaos, we cannot be highly confident
      const CHAOS_CAP = profile.thresholds.chaosRegimeCap; 
      if (calibrated > CHAOS_CAP) {
         LoggerService.info(`[MARS Bounds] Chaos regime detected. Hard capping confidence to ${CHAOS_CAP}`);
         calibrated = CHAOS_CAP;
      }
    }

    return calibrated;
  }
}
