import { IRecommendationEngine, MARSRecommendation } from '../../interfaces/IRecommendationEngine';
import { TemporalContext } from '../context/ContextAggregator';
import { CognitiveHypothesis } from '../reasoning/HypothesisGenerationEngine';
import { RealityCheckReport } from '../calibration/RealityCheckEngine';
import { UnifiedExplainabilityEngine } from './UnifiedExplainabilityEngine';

export class RecommendationEngine implements IRecommendationEngine {
  private explainability: UnifiedExplainabilityEngine;

  constructor() {
    this.explainability = new UnifiedExplainabilityEngine();
  }

  public buildRecommendation(
    context: TemporalContext, 
    hypothesis: CognitiveHypothesis, 
    calibratedConfidence: number, 
    realityCheckPassed: boolean,
    v1Decision?: any
  ): MARSRecommendation {
    
    let action: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
    if (realityCheckPassed) {
      if (v1Decision && (v1Decision.signal === 'BUY' || v1Decision.signal === 'SELL')) {
        action = v1Decision.signal;
      } else {
        action = 'WAIT';
      }
    }

    // Combine NN confidence with V1 confidence if available
    let confidencePercentage = Math.round(calibratedConfidence * 100);
    if (v1Decision && v1Decision.confidence) {
      confidencePercentage = Math.round((confidencePercentage + v1Decision.confidence) / 2);
    }

    const tradeScore = v1Decision ? v1Decision.tradeScore : Math.round(confidencePercentage * 0.95);
    let riskLevel: 'LOW' | 'MED' | 'HIGH' = 'MED';
    if (v1Decision) {
       riskLevel = v1Decision.riskLevel < 40 ? 'LOW' : (v1Decision.riskLevel < 70 ? 'MED' : 'HIGH');
    } else {
       riskLevel = realityCheckPassed ? (confidencePercentage > 80 ? 'LOW' : 'MED') : 'HIGH';
    }

    let entryNow = false;
    if (action === 'BUY' || action === 'SELL') {
      entryNow = true;
    }

    return {
      id: `REC-${Date.now()}`,
      timestamp: Date.now(),
      action,
      confidence: confidencePercentage,
      tradeScore, 
      riskLevel,
      recommendedExpiry: v1Decision ? v1Decision.recommendedExpiry : '1 MINUTE',
      entryNow,
      
      whyTake: action !== 'WAIT' ? [
        { text: 'Confluence confirmed', icon: 'check' as const },
        { text: 'Market structure aligned', icon: 'check' as const },
        { text: 'Risk to reward is favorable', icon: 'check' as const }
      ] : [],
      
      whyNotTake: action === 'WAIT' ? [
        { text: v1Decision?.nearestDanger !== 'None' && v1Decision?.nearestDanger ? String(v1Decision.nearestDanger) : 'Trade score too low', icon: 'x' as const },
        { text: 'Waiting for pristine setup', icon: 'x' as const }
      ] : [
        { text: 'No major warnings', icon: 'check' as const },
        { text: 'All conditions favorable', icon: 'check' as const }
      ],
      
      nearestDanger: v1Decision?.nearestDanger || (realityCheckPassed ? 'None' : 'Extreme Volatility Zone'),
      
      checklist: v1Decision ? v1Decision.checklist.map((c: any) => ({ label: c.label, pass: c.ok })) : [
        { label: 'Support Hit', pass: realityCheckPassed },
        { label: 'Resistance Hit', pass: realityCheckPassed },
        { label: 'Liquidity Confirmed', pass: calibratedConfidence > 60 },
        { label: 'Candle Confirmed', pass: calibratedConfidence > 70 },
        { label: 'Risk Acceptable', pass: realityCheckPassed }
      ],
      
      scientificReasoning: this.explainability.generateScientificReasoning(hypothesis, context),
      institutionalBias: v1Decision?.institutionalBias || 'Neutral',
      riskWarning: this.explainability.generateRiskWarning({ passed: realityCheckPassed, finalConfidence: calibratedConfidence, warnings: [] }, calibratedConfidence),
      contextId: context.id
    };
  }
}
