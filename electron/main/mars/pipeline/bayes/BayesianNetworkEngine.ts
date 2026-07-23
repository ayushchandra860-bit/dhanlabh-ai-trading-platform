import { DataIntegrityPipeline } from '../safety/DataIntegrityPipeline';
import { LoggerService } from '../../../LoggerService';

export class BayesianNetworkEngine {
  private integrity: DataIntegrityPipeline;

  constructor() {
    this.integrity = new DataIntegrityPipeline();
  }

  /**
   * Performs a strict Bayesian Update.
   * P(H|E) = (P(E|H) * P(H)) / P(E)
   * 
   * @param prior P(H) - The prior probability of the Hypothesis (0.0 to 1.0)
   * @param likelihood P(E|H) - The probability of observing this Evidence given the Hypothesis is true
   * @param marginal P(E) - The probability of observing this Evidence under any circumstance
   * @returns P(H|E) - The updated posterior probability (0.0 to 1.0)
   */
  public updateBelief(prior: number, likelihood: number, marginal: number): number {
    try {
      const p = this.integrity.clampProbability(prior);
      const l = this.integrity.clampProbability(likelihood);
      let m = this.integrity.clampProbability(marginal);

      // Prevent division by zero
      if (m === 0) {
        LoggerService.warn('[MARS Bayes] Marginal probability P(E) was 0. Adjusting to epsilon to prevent crash.');
        m = 0.0001; 
      }

      const posterior = (l * p) / m;
      
      // Strict mathematical bounding
      return this.integrity.clampProbability(posterior);
    } catch (err) {
      LoggerService.error(`[MARS Bayes] Math failure during belief update: ${err}`);
      return prior; // Fail-safe: retain prior belief
    }
  }
}
