import { CognitiveHypothesis } from '../reasoning/HypothesisGenerationEngine';
import { DataIntegrityPipeline } from '../safety/DataIntegrityPipeline';

export class PriorBeliefInitializer {
  private integrity: DataIntegrityPipeline;

  constructor() {
    this.integrity = new DataIntegrityPipeline();
  }

  /**
   * Translates the raw hypothesis confidence (0-100) into a formal Bayesian Prior (0.0 - 1.0).
   */
  public getPrior(hypothesis: CognitiveHypothesis): number {
    const rawPrior = hypothesis.confidence / 100.0;
    return this.integrity.clampProbability(rawPrior);
  }
}
