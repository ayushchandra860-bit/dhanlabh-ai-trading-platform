import { ExtractedFeatures } from '../math/FeatureExtractionEngine';

export type MarketRegime = 
  | 'HIGH_VOLATILITY_TREND'
  | 'LOW_VOLATILITY_TREND'
  | 'HIGH_VOLATILITY_RANGE'
  | 'LOW_VOLATILITY_RANGE'
  | 'CHAOS_TRANSITION'
  | 'UNKNOWN';

export class RegimeClassifier {
  
  /**
   * Evaluates the extracted raw features (pre-scaling) to classify the global market regime.
   */
  public classify(features: ExtractedFeatures): MarketRegime {
    if (features.volatility === 0 && features.momentum === 0) {
      return 'UNKNOWN';
    }

    // Thresholds (In a real ML system, these are learned bounds. Here we mock logical limits)
    const VOLATILITY_THRESHOLD = 50; 
    const MOMENTUM_THRESHOLD = 150;

    const isHighVol = features.volatility > VOLATILITY_THRESHOLD;
    const isTrending = Math.abs(features.momentum) > MOMENTUM_THRESHOLD;

    if (isHighVol && isTrending) {
      return 'HIGH_VOLATILITY_TREND';
    } else if (!isHighVol && isTrending) {
      return 'LOW_VOLATILITY_TREND';
    } else if (isHighVol && !isTrending) {
      // High volatility but no momentum = chopping back and forth violently
      return 'HIGH_VOLATILITY_RANGE';
    } else if (!isHighVol && !isTrending) {
      return 'LOW_VOLATILITY_RANGE';
    }

    return 'CHAOS_TRANSITION';
  }
}
