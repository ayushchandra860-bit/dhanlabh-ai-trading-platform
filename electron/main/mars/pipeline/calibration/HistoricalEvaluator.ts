import { CalibrationProfile, CalibrationMetrics } from './CalibrationTypes';
import { HistoricalRecord } from './CalibrationDatasetValidator';
import { LoggerService } from '../../../LoggerService';

export class HistoricalEvaluator {
  
  /**
   * Evaluates a historical dataset against a specific calibration profile.
   * This function simulates how the system would have performed if it used
   * the given profile's parameters.
   */
  public evaluate(dataset: HistoricalRecord[], profile: CalibrationProfile): CalibrationMetrics {
    let correctPredictions = 0;
    let brierScoreSum = 0;

    for (const record of dataset) {
      // Re-run the hypothesis generation heuristic using the profile's parameters
      // Note: In a full pipeline simulation, we would inject the profile into the engines.
      // Here we approximate the confidence generation based on the regime parameters.
      let simulatedConfidence = 50.0;
      
      // Simulate HypothesisGenerationEngine logic with new profile
      // For simplicity, we assume we can infer the regime from the hypothesis expectedOutcome
      if (record.hypothesis.expectedOutcome.includes('HIGH_VOLATILITY_TREND')) {
        simulatedConfidence = profile.regimes.highVolTrendConfidence;
      } else if (record.hypothesis.expectedOutcome.includes('LOW_VOLATILITY_RANGE')) {
        simulatedConfidence = profile.regimes.lowVolRangeConfidence;
      } else if (record.hypothesis.expectedOutcome.includes('HIGH_VOLATILITY_RANGE')) {
        simulatedConfidence = profile.regimes.highVolRangeConfidence;
      } else if (record.hypothesis.expectedOutcome.includes('LOW_VOLATILITY_TREND')) {
        simulatedConfidence = profile.regimes.lowVolTrendConfidence;
      } else {
        // Fallback to original if regime can't be mapped
        simulatedConfidence = record.hypothesis.confidence;
      }

      // Apply confidence bounds based on the profile
      if (simulatedConfidence > (profile.thresholds.maxConfidenceCap * 100)) {
        simulatedConfidence = profile.thresholds.maxConfidenceCap * 100;
      }

      // Normalize confidence to 0-1 probability
      const predictedProb = simulatedConfidence / 100.0;
      
      // Actual outcome encoding (1 if correct, 0 if wrong)
      const isCorrect = record.hypothesis.prediction === record.actualOutcome;
      const actualOutcomeProb = isCorrect ? 1.0 : 0.0;
      
      if (isCorrect) {
        correctPredictions++;
      }

      // Brier Score calculation: (predicted_prob - actual_outcome)^2
      const brierError = Math.pow(predictedProb - actualOutcomeProb, 2);
      brierScoreSum += brierError;
    }

    const winRate = dataset.length > 0 ? (correctPredictions / dataset.length) : 0;
    const brierScore = dataset.length > 0 ? (brierScoreSum / dataset.length) : 0;

    LoggerService.info(`[HistoricalEvaluator] Evaluated profile ${profile.id}. WinRate: ${(winRate*100).toFixed(2)}%, BrierScore: ${brierScore.toFixed(4)}`);

    return {
      sampleSize: dataset.length,
      winRate,
      brierScore
    };
  }

  /**
   * Performs walk-forward validation by splitting the dataset chronologically.
   * Trains on the first split (in reality, just evaluated here for comparison)
   * and tests on the second split.
   */
  public walkForwardValidate(dataset: HistoricalRecord[], profile: CalibrationProfile, splitRatio: number = 0.7): CalibrationMetrics {
    const sorted = [...dataset].sort((a, b) => a.timestamp - b.timestamp);
    const splitIndex = Math.floor(sorted.length * splitRatio);
    
    // We only care about out-of-sample metrics for true validation
    const outOfSample = sorted.slice(splitIndex);
    
    LoggerService.info(`[HistoricalEvaluator] Running walk-forward validation on ${outOfSample.length} out-of-sample records.`);
    return this.evaluate(outOfSample, profile);
  }
}
