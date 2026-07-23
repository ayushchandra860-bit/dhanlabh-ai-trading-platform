import { TemporalContext } from '../context/ContextAggregator';
import { CalibrationConfigManager } from '../calibration/CalibrationConfigManager';

export interface CognitiveHypothesis {
  id: string;
  contextId: string; // Link to the TemporalContext that spawned this
  prediction: 'CONTINUATION' | 'REVERSAL' | 'BREAKOUT' | 'CHOP';
  confidence: number;
  expectedOutcome: string;
}

export class HypothesisGenerationEngine {
  private config: CalibrationConfigManager;

  constructor(config: CalibrationConfigManager) {
    this.config = config;
  }
  
  /**
   * Generates a forward-looking hypothesis based strictly on the current TemporalContext.
   */
  public generate(context: TemporalContext): CognitiveHypothesis {
    let prediction: 'CONTINUATION' | 'REVERSAL' | 'BREAKOUT' | 'CHOP' = 'CHOP';
    let confidence = 50.0;
    
    const profile = this.config.getActiveProfile();

    // A very simple deterministic heuristic for the initial architecture stub.
    // In later iterations, this will use the Neural pathways or Bayesian updates.
    if (context.marketRegime === 'HIGH_VOLATILITY_TREND') {
      prediction = 'CONTINUATION';
      confidence = profile.regimes.highVolTrendConfidence;
    } else if (context.marketRegime === 'LOW_VOLATILITY_RANGE') {
      prediction = 'REVERSAL'; // Mean reversion
      confidence = profile.regimes.lowVolRangeConfidence;
    } else if (context.marketRegime === 'HIGH_VOLATILITY_RANGE') {
      prediction = 'CHOP';
      confidence = profile.regimes.highVolRangeConfidence; // High confidence it will be un-tradable
    } else if (context.marketRegime === 'LOW_VOLATILITY_TREND') {
      prediction = 'BREAKOUT';
      confidence = profile.regimes.lowVolTrendConfidence;
    }

    // Boost confidence if cross-timeframes align
    if (context.isTimeframeAligned) {
      confidence = Math.min(100.0, confidence + profile.regimes.timeframeAlignmentBoost);
    }

    return {
      id: `HYP-${Date.now()}`,
      contextId: context.id,
      prediction,
      confidence,
      expectedOutcome: `Expect ${prediction} due to ${context.marketRegime}`
    };
  }
}
