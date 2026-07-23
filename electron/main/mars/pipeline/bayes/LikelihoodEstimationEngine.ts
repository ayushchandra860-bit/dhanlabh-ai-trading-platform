import { VisionResult } from '../../../vision';
import { CognitiveHypothesis } from '../reasoning/HypothesisGenerationEngine';
import { DataIntegrityPipeline } from '../safety/DataIntegrityPipeline';
import { CalibrationConfigManager } from '../calibration/CalibrationConfigManager';

export class LikelihoodEstimationEngine {
  private integrity: DataIntegrityPipeline;
  private config: CalibrationConfigManager;

  constructor(config: CalibrationConfigManager) {
    this.integrity = new DataIntegrityPipeline();
    this.config = config;
  }

  /**
   * Estimates P(E|H): The likelihood of seeing the current visual evidence assuming the hypothesis is true.
   */
  public estimateLikelihood(evidence: VisionResult, hypothesis: CognitiveHypothesis): number {
    const profile = this.config.getActiveProfile();
    let likelihood = profile.likelihoods.neutralBaseline;

    // In a mature system, this would evaluate specific SMC patterns (e.g. FVG, OrderBlocks)
    // against the hypothesis. For the initial architecture, we use a basic heuristic map.
    
    if (hypothesis.prediction === 'CONTINUATION') {
      // If we expect continuation, strong trends in the evidence support it
      if (evidence.trendData?.currentTrend?.strength && evidence.trendData.currentTrend.strength > 70) {
        likelihood = profile.likelihoods.trendContinuationMultiplier;
      }
    } else if (hypothesis.prediction === 'REVERSAL') {
      // If we expect a reversal, signs of exhaustion or divergence support it
      if (evidence.momentumData?.state === 'Exhaustion') {
        likelihood = profile.likelihoods.reversalExhaustionMultiplier;
      }
    }

    return this.integrity.clampProbability(likelihood);
  }

  /**
   * Estimates P(E): The marginal probability of seeing this evidence universally.
   */
  public estimateMarginal(evidence: VisionResult): number {
    const profile = this.config.getActiveProfile();
    // For now, assume a uniform marginal probability for standard patterns.
    // In production, this queries the DB to find historical frequency of the event.
    return profile.likelihoods.neutralBaseline;
  }
}
