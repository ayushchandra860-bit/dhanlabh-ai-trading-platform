import { TemporalContext } from '../context/ContextAggregator';
import { CognitiveHypothesis } from '../reasoning/HypothesisGenerationEngine';
import { RealityCheckReport } from '../calibration/RealityCheckEngine';

export class UnifiedExplainabilityEngine {
  
  public generateScientificReasoning(hypothesis: CognitiveHypothesis, context: TemporalContext): string {
    let reasoning = `Based on the current ${context.marketRegime} structure, MARS hypothesizes a ${hypothesis.prediction}. `;
    
    if (context.isTimeframeAligned) {
      reasoning += `This is strongly supported by multi-timeframe alignment across the cache. `;
    } else {
      reasoning += `Warning: Missing multi-timeframe alignment reduces predictive reliability. `;
    }

    return reasoning;
  }

  public generateRiskWarning(realityCheck: RealityCheckReport, confidence: number): string {
    if (!realityCheck.passed) {
      return `CRITICAL RISK: MARS reality checks failed. ${realityCheck.warnings.join(' ')}`;
    }
    if (confidence < 0.75) {
      return `MODERATE RISK: Confidence is acceptable but lacks institutional-grade mathematical certainty.`;
    }
    return `LOW RISK: Statistical boundaries and multi-tier reality checks successfully passed.`;
  }
}
