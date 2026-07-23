export interface CalibrationProfile {
  id: string;
  version: string;
  createdAt: number;
  description: string;

  // Thresholds (RealityCheckEngine & ConfidenceBoundsManager)
  thresholds: {
    minimumActionableConfidence: number; // RealityCheck minimum threshold
    singleTimeframePenalty: number;      // Penalty when not aligned across timeframes
    maxConfidenceCap: number;            // Global maximum bounds
    chaosRegimeCap: number;              // Capped confidence in CHAOS regimes
  };

  // Likelihood Baseline Parameters (LikelihoodEstimationEngine)
  likelihoods: {
    neutralBaseline: number;
    trendContinuationMultiplier: number; // e.g. 0.8
    reversalExhaustionMultiplier: number; // e.g. 0.85
  };

  // Regime Parameters (HypothesisGenerationEngine)
  regimes: {
    highVolTrendConfidence: number;      // e.g. 80.0
    lowVolRangeConfidence: number;       // e.g. 65.0
    highVolRangeConfidence: number;      // e.g. 90.0 (CHOP)
    lowVolTrendConfidence: number;       // e.g. 55.0
    timeframeAlignmentBoost: number;     // e.g. 15.0
  };
}

export interface CalibrationAuditLog {
  timestamp: number;
  action: 'CREATE_CANDIDATE' | 'ACTIVATE_PROFILE' | 'ROLLBACK_PROFILE' | 'SHADOW_MODE_RUN';
  targetProfileId: string;
  previousProfileId?: string;
  reason: string;
  metricsBefore?: CalibrationMetrics;
  metricsAfter?: CalibrationMetrics;
}

export interface CalibrationMetrics {
  sampleSize: number;
  winRate: number;      // Percentage of correct predictions
  brierScore: number;   // Mean squared difference between predicted probability and actual outcome
  profitFactor?: number; // Total profit / total loss (optional)
}

export interface ValidationReport {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  datasetSize: number;
}
