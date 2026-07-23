import { CalibrationProfile } from './CalibrationTypes';
import { HistoricalRecord } from './CalibrationDatasetValidator';
import { HistoricalEvaluator } from './HistoricalEvaluator';
import { LoggerService } from '../../../LoggerService';

export class ParameterOptimizer {
  private evaluator: HistoricalEvaluator;

  constructor(evaluator: HistoricalEvaluator) {
    this.evaluator = evaluator;
  }

  /**
   * Deterministically generates a candidate profile based on historical data.
   * NEVER mutates the production profile directly.
   */
  public generateCandidate(
    baseProfile: CalibrationProfile,
    trainingDataset: HistoricalRecord[]
  ): CalibrationProfile {
    LoggerService.info('[ParameterOptimizer] Starting deterministic candidate generation...');

    // Deep copy base profile to create candidate
    const candidate: CalibrationProfile = JSON.parse(JSON.stringify(baseProfile));
    candidate.id = `candidate-${Date.now()}`;
    candidate.version = `${baseProfile.version}-beta`;
    candidate.description = `Candidate profile generated via deterministic optimization from ${baseProfile.id}`;

    const baselineMetrics = this.evaluator.evaluate(trainingDataset, baseProfile);
    
    // Very simple grid search / heuristic adjustment for demonstration
    // We try tweaking the chaosRegimeCap and highVolTrendConfidence
    const tweaks = [
      { chaosCapDelta: -0.05, trendConfDelta: +5.0 },
      { chaosCapDelta: -0.10, trendConfDelta: +10.0 },
      { chaosCapDelta: +0.05, trendConfDelta: -5.0 }
    ];

    let bestMetrics = baselineMetrics;
    let bestTweak = null;

    for (const tweak of tweaks) {
      const tempProfile: CalibrationProfile = JSON.parse(JSON.stringify(candidate));
      tempProfile.thresholds.chaosRegimeCap += tweak.chaosCapDelta;
      tempProfile.regimes.highVolTrendConfidence += tweak.trendConfDelta;
      
      const metrics = this.evaluator.evaluate(trainingDataset, tempProfile);
      
      // Compare using Brier Score (lower is better) or WinRate
      if (metrics.brierScore < bestMetrics.brierScore) {
        bestMetrics = metrics;
        bestTweak = tweak;
      }
    }

    if (bestTweak) {
      candidate.thresholds.chaosRegimeCap += bestTweak.chaosCapDelta;
      candidate.regimes.highVolTrendConfidence += bestTweak.trendConfDelta;
      LoggerService.info(`[ParameterOptimizer] Found better parameters. Expected Brier Score: ${bestMetrics.brierScore.toFixed(4)}`);
    } else {
      LoggerService.info('[ParameterOptimizer] No improvement found. Candidate will mirror base profile exactly.');
    }

    return candidate;
  }
}
