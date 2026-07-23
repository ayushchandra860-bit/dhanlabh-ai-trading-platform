import { TemporalContext } from '../context/ContextAggregator';
import { CognitiveHypothesis } from '../reasoning/HypothesisGenerationEngine';

export interface DecisionLogEntry {
  timestamp: number;
  marketSnapshotId: string; // reference to the mock candle window
  features: number[];
  bayesianPosterior: number;
  neuralOutput?: number[];
  regime: string;
  confidence: number;
  recommendation: 'BUY' | 'SELL' | 'WAIT';
  
  // These are populated AFTER the future outcome is known
  actualOutcome?: 'CONTINUATION' | 'REVERSAL' | 'BREAKOUT' | 'CHOP';
  priceDelta?: number; // How much price moved 5 mins later
  isCorrect?: boolean;
  failureCategory?: FailureCategory;
  
  reasoningTrace: string[];
  activeProfileId: string;
}

export type FailureCategory = 
  | 'FALSE_BUY' 
  | 'FALSE_SELL' 
  | 'FALSE_HOLD' 
  | 'LATE_ENTRY' 
  | 'EARLY_EXIT' 
  | 'CONFIDENCE_OVERESTIMATION' 
  | 'CONFIDENCE_UNDERESTIMATION' 
  | 'WRONG_REGIME' 
  | 'PATTERN_MISMATCH'
  | 'NONE';

export interface ValidationMetrics {
  totalDecisions: number;
  accuracy: number;
  precisionBuy: number;
  recallBuy: number;
  f1Buy: number;
  winRate: number;
  lossRate: number;
  avgConfidence: number;
  brierScore: number; // Calibration Error
  profitFactor: number;
  expectancy: number;
  maxDrawdown: number;
  
  failuresByCategory: Record<FailureCategory, number>;
  regimePerformance: Record<string, { win: number, loss: number }>;
}
