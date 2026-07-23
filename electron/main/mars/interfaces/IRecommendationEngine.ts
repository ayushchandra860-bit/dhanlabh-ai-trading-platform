import { TemporalContext } from '../pipeline/context/ContextAggregator';
import { CognitiveHypothesis } from '../pipeline/reasoning/HypothesisGenerationEngine';

export interface MARSRecommendation {
  id: string;
  timestamp: number;
  
  // The Strict Action
  action: 'BUY' | 'SELL' | 'WAIT';
  
  // Mathematical Confidence (strictly calibrated)
  confidence: number;
  
  // Detailed Structured Explanations
  tradeScore: number;
  riskLevel: 'LOW' | 'MED' | 'HIGH';
  recommendedExpiry: string;
  entryNow: boolean;
  
  whyTake: { text: string; icon: 'check' | 'x' }[];
  whyNotTake: { text: string; icon: 'check' | 'x' }[];
  nearestDanger: string;
  
  checklist: { label: string; pass: boolean }[];
  
  scientificReasoning: string;
  institutionalBias: string;
  riskWarning: string;

  // Raw Context for UI / Advanced Debugging
  contextId: string;
}

export interface IRecommendationEngine {
  /**
   * Translates the final Cognitive States into a concrete Action Payload for the V1.0 Execution Core.
   */
  buildRecommendation(
    context: TemporalContext, 
    hypothesis: CognitiveHypothesis, 
    calibratedConfidence: number,
    realityCheckPassed: boolean,
    v1Decision?: any
  ): MARSRecommendation;
}
