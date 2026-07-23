import { LoggerService } from '../../../LoggerService';

export class DataIntegrityPipeline {
  
  /**
   * Validates a numerical array (e.g. Feature Vector) to guarantee absolute mathematical safety.
   */
  public sanitizeVector(vector: number[], contextName: string): number[] {
    for (let i = 0; i < vector.length; i++) {
      if (Number.isNaN(vector[i]) || !Number.isFinite(vector[i])) {
        LoggerService.warn(`[MARS Integrity] Corrupted math detected in ${contextName} at index ${i}. Value was ${vector[i]}. Sanitizing to 0.`);
        vector[i] = 0;
      }
    }
    return vector;
  }

  /**
   * Validates any generic number, throwing if it's unsafe.
   */
  public validateNumberStrict(val: number, label: string): number {
    if (Number.isNaN(val) || !Number.isFinite(val)) {
      throw new Error(`[MARS Integrity] Strict Math Violation in ${label}: Value is NaN or Infinity.`);
    }
    return val;
  }

  /**
   * Ensures probabilities are strictly between 0 and 1.
   */
  public clampProbability(val: number): number {
    if (Number.isNaN(val)) return 0.5;
    if (val < 0.0) return 0.0;
    if (val > 1.0) return 1.0;
    return val;
  }
}
