import { ExtractedFeatures } from './FeatureExtractionEngine';
import { DataIntegrityPipeline } from '../safety/DataIntegrityPipeline';

export class FeatureScaler {
  private integrityPipeline: DataIntegrityPipeline;

  constructor() {
    this.integrityPipeline = new DataIntegrityPipeline();
  }

  /**
   * Scales extracted features into a normalized vector [-1.0, 1.0] or [0.0, 1.0] for KDTree ingestion.
   * Uses Min-Max scaling with hardcoded historical bounds for the prototype (to be dynamic later).
   */
  public scaleFeatures(features: ExtractedFeatures): number[] {
    // Mocked min-max bounds for pixels
    const MAX_VOLATILITY_PX = 200; 
    const MAX_MOMENTUM_PX = 500;
    const MAX_SPREAD_PX = 150;
    const MAX_STD_DEV_PX = 100;

    let normVol = features.volatility / MAX_VOLATILITY_PX;
    // Momentum can be negative, so map [-MAX, +MAX] to [-1.0, 1.0]
    let normMom = features.momentum / MAX_MOMENTUM_PX;
    let normSpr = features.spread / MAX_SPREAD_PX;
    let normStd = features.standardDeviation / MAX_STD_DEV_PX;

    // Winsorization (Clipping Outliers) to strictly [-1.0, 1.0]
    normVol = Math.max(0.0, Math.min(1.0, normVol));
    normMom = Math.max(-1.0, Math.min(1.0, normMom));
    normSpr = Math.max(0.0, Math.min(1.0, normSpr));
    normStd = Math.max(0.0, Math.min(1.0, normStd));

    const vector = [normVol, normMom, normSpr, normStd];
    
    // Final boundary check
    return this.integrityPipeline.sanitizeVector(vector, 'FeatureScaler');
  }
}
