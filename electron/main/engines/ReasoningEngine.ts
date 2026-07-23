import { LoggerService } from '../LoggerService';
import { config } from '../config';
import { 
  Candle, MarketState, SupportResistanceData, TrendData, 
  MarketStructureData, BosChochData, LiquidityData, OrderBlockData, 
  FvgData, PriceActionData, ConfluenceData, TradeScoreData, 
  AIDecisionData, AIReasoning, TrendDirection, ReasonCategory, ReasonPriority, AIReason, AIDecisionType, PriceActionPattern, LiquiditySweep
} from '../vision';
import { OcrResult } from '../ocr';


export class ReasoningEngine {

  public generateAIReasons(
    aiDecisionData: AIDecisionData,
    tradeScoreData: TradeScoreData | null,
    confluenceData: ConfluenceData | null,
    trendData: TrendData | null,
    supportResistanceData: SupportResistanceData | null,
    marketStructureData: MarketStructureData | null,
    bosChochData: BosChochData | null,
    liquidityData: LiquidityData | null,
    orderBlockData: OrderBlockData | null,
    fvgData: FvgData | null,
    priceActionData: PriceActionData | null,
    currentPriceY: number | null
  ): AIReasoning | null {
    LoggerService.info('VisionManager: Starting AI Reason Generator.');
    const timestamp = Date.now();
    const positiveReasons: AIReason[] = [];
    const negativeReasons: AIReason[] = [];
    const direction = aiDecisionData.signal === 'BUY' ? 'bullish' : (aiDecisionData.signal === 'SELL' ? 'bearish' : 'neutral');
    
    const addReason = (isPositive: boolean, category: ReasonCategory, description: string, confidence: number, moduleSource: string, evidence: string): void => {
      const reason: AIReason = {
        id: this.generateReasonId(category, description, timestamp + positiveReasons.length + negativeReasons.length),
        decisionId: aiDecisionData.id,
        priority: ReasonPriority.Primary,
        category,
        description,
        moduleSource,
        evidence,
        confidence: this.clampScore(confidence),
        timestamp,
      };
      if (isPositive) positiveReasons.push(reason);
      else negativeReasons.push(reason);
    };

    if (aiDecisionData.signal !== 'WAIT' && aiDecisionData.signal !== 'ANALYZING' && aiDecisionData.signal !== 'NO SIGNAL' && aiDecisionData.signal !== 'LOW CONFIDENCE') {
        if (tradeScoreData) addReason(true, ReasonCategory.TradeScore, `Trade score is strong at ${tradeScoreData.overallScore}/100.`, tradeScoreData.confidence, 'TradeScoringEngine', `Score derived from ${tradeScoreData.bullishPercentage}% bullish vs ${tradeScoreData.bearishPercentage}% bearish factors`);
        if (confluenceData && confluenceData.confluenceScore > 60) addReason(true, ReasonCategory.SMCConfluence, `Confluence alignment confirmed.`, confluenceData.confidence, 'ConfluenceEngine', confluenceData.reasonSummary);
        if (trendData?.currentTrend && direction !== 'neutral') {
            const isTrendAligned = (direction === 'bullish' && this.isBullishTrend(trendData.currentTrend.direction)) || (direction === 'bearish' && this.isBearishTrend(trendData.currentTrend.direction));
            if (isTrendAligned) addReason(true, ReasonCategory.Trend, `Trend is ${trendData.currentTrend.direction}.`, trendData.currentTrend.confidence, 'TrendDetectionEngine', `Momentum score is ${trendData.currentTrend.momentumScore}/100`);
        }
        if (priceActionData?.latestPattern) {
            const isPaAligned = priceActionData.latestPattern.direction === direction;
            addReason(isPaAligned, ReasonCategory.PriceAction, `Pattern ${priceActionData.latestPattern.patternName} detected.`, priceActionData.latestPattern.confidence, 'PriceActionEngine', `Pattern quality is ${priceActionData.latestPattern.patternQuality}/100`);
        }
        if (liquidityData?.latestSweep) {
            const isLiqAligned = liquidityData.latestSweep.direction === direction;
            addReason(isLiqAligned, ReasonCategory.Liquidity, `Liquidity swept at ${liquidityData.latestSweep.id}.`, liquidityData.latestSweep.confidence, 'LiquidityEngine', `Rejection strength is ${liquidityData.latestSweep.rejectionStrength}/100`);
        }
        if (aiDecisionData.riskLevel > 50) {
            addReason(false, ReasonCategory.RiskManagement, `Elevated risk level (${aiDecisionData.riskLevel}/100).`, 100, 'RiskEngine', `Volatility and fake breakout probabilities are high`);
        }
    } else {
        if (aiDecisionData.riskLevel > 70) addReason(false, ReasonCategory.RiskManagement, `Market risk is too high.`, 90, 'RiskEngine', `Risk score ${aiDecisionData.riskLevel}/100 exceeds safety threshold`);
        if (confluenceData && confluenceData.confluenceScore < 40) addReason(false, ReasonCategory.SMCConfluence, `Lack of confluence.`, 80, 'ConfluenceEngine', `Confluence score ${confluenceData.confluenceScore}/100 is below minimum threshold`);
    }

    const riskExplanation = `Risk is ${aiDecisionData.riskLevel}/100; retail trap ${tradeScoreData?.retailTrapRisk ?? 0}/100 and fake breakout ${tradeScoreData?.fakeBreakoutRisk ?? 0}/100.`;
    const confidenceExplanation = `Decision confidence is ${aiDecisionData.confidence}% from trade score ${tradeScoreData?.confidence ?? 0}/100, confluence ${confluenceData?.confidence ?? 0}/100, and engine confidence ${aiDecisionData.confidence}%.`;
    const institutionalSummary = `Institutional bias is ${confluenceData?.institutionalBias ?? 'neutral'}; bullish ${tradeScoreData?.bullishPercentage ?? 0}% versus bearish ${tradeScoreData?.bearishPercentage ?? 0}%.`;
    const retailWarning = aiDecisionData.riskLevel >= 70
      ? 'High risk context: wait for cleaner confirmation or avoid chasing the move.'
      : 'Risk context is acceptable if execution remains aligned with the detected levels.';
    const marketSummary = `Current price Y ${currentPriceY}; structure ${marketStructureData?.currentStructure ?? 'unknown'}, trend ${trendData?.currentTrend?.direction ?? 'unknown'}, latest pattern ${priceActionData?.latestPattern?.patternName ?? 'none'}.`;
    
    return {
      decisionSummary: `${aiDecisionData.signal}: ${aiDecisionData.signal}`,
      positiveReasons,
      negativeReasons,
      riskExplanation,
      confidenceExplanation,
      institutionalSummary,
      retailWarning,
      marketSummary,
    };
  }

  public clampScore(value: number, min = 0, max = 100): number {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, Math.round(value)));
  }

  public generateReasonId(category: ReasonCategory, description: string, timestamp: number): string {
    return `${category.replace(/[^a-zA-Z0-9]/g, '')}-${description.replace(/[^a-zA-Z0-9]/g, '').slice(0, 28)}-${timestamp}`;
  }

  public isBullishTrend(direction: TrendDirection | undefined): boolean {
    return direction === 'strong_uptrend' || direction === 'weak_uptrend' || direction === 'accumulation';
  }

  public isBearishTrend(direction: TrendDirection | undefined): boolean {
    return direction === 'strong_downtrend' || direction === 'weak_downtrend' || direction === 'distribution';
  }

  public distanceQuality(distance: number, averageCandleSize: number): number {
    const normalized = averageCandleSize > 0 ? distance / averageCandleSize : distance;
    return this.clampScore(100 - normalized * 18);
  }

}
