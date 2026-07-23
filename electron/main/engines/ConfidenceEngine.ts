import { LoggerService } from '../LoggerService';
import { TrendData, PriceActionData, MomentumData, ConfluenceData, RiskData } from '../vision';

export class ConfidenceEngine {
  public calculateConfidence(
    trendData: TrendData | null,
    priceActionData: PriceActionData | null,
    momentumData: MomentumData | null,
    confluenceData: ConfluenceData | null,
    riskData: RiskData | null
  ): number {
    
    // Base confidence is dynamic, not a static 50
    let score = 0;
    let factors = 0;

    // Trend Confidence
    if (trendData?.currentTrend) {
      if (trendData.currentTrend.direction.includes('strong')) score += 85;
      else if (trendData.currentTrend.direction.includes('weak')) score += 60;
      else score += 40; // sideways
      factors++;
    }

    // Pattern Confidence
    if (priceActionData?.latestPattern) {
      score += priceActionData.latestPattern.confidence;
      factors++;
    }

    // Momentum Confidence
    if (momentumData) {
      if (momentumData.state === 'Acceleration') score += 80;
      else if (momentumData.state === 'Exhaustion') score += 30;
      else score += 50;
      factors++;
    }

    // Confluence Confidence
    if (confluenceData) {
      score += confluenceData.confluenceScore;
      factors++;
    }

    // Risk Penalty
    if (riskData) {
      score += (100 - riskData.riskLevel);
      factors++;
    }

    const finalConfidence = factors > 0 ? Math.round(score / factors) : 0;
    return Math.max(0, Math.min(100, finalConfidence));
  }
}
