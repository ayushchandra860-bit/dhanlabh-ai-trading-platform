import { LoggerService } from '../../../LoggerService';

export class ConfidenceAttributionLogger {
  
  /**
   * Generates a deterministic log of exactly how the final confidence score was calculated.
   * This provides full XAI (Explainable AI) auditing.
   */
  public logAttribution(
    hypothesisId: string, 
    prior: number, 
    likelihood: number, 
    marginal: number, 
    posterior: number, 
    calibrated: number
  ): void {
    const logString = `
    [MARS XAI] Confidence Attribution for Hypothesis ${hypothesisId}
    --------------------------------------------------------------
    1. Base Prior P(H)      : ${(prior * 100).toFixed(2)}%
    2. Likelihood P(E|H)    : ${(likelihood * 100).toFixed(2)}%
    3. Marginal P(E)        : ${(marginal * 100).toFixed(2)}%
    4. Bayesian Posterior   : ${(posterior * 100).toFixed(2)}%
    5. Final Calibrated     : ${(calibrated * 100).toFixed(2)}%
    --------------------------------------------------------------
    `;
    
    // In production, this might write to a dedicated audit file or the CKG
    LoggerService.info(logString);
  }
}
