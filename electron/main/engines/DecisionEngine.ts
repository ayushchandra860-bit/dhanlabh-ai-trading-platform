import { LoggerService } from '../LoggerService';
import { 
  Candle, MarketState, SupportResistanceData, TrendData, 
  MarketStructureData, BosChochData, LiquidityData, OrderBlockData, 
  FvgData, PriceActionData, ConfluenceData, TradeScoreData, 
  AIDecisionData, AIReasoning, ReasonCategory, ReasonPriority, AIReason, AIDecisionType, StabilityData, MultiTimeframeData, LiveMarketObservation, ChartConnectionData, InstitutionalBias
} from '../vision';
import { ConflictData } from './ConflictDetectionEngine';
import { SelfCalibrationEngine } from '../services/SelfCalibrationEngine';
import { SignalAnalyticsService } from '../services/SignalAnalyticsService';

export class DecisionEngine {
  public lastAIDecisionData: AIDecisionData | null = null;
  private safeModeEndTime: number = 0;
  private activeSignalState: { 
    signal: AIDecisionType; 
    timestamp: number; 
    lockUntil: number; 
    entryConfidence: number;
  } | null = null;
  
  public async makeAIDecision(
    candles: Candle[] | null,
    trendData: TrendData | null,
    supportResistanceData: SupportResistanceData | null,
    marketStructureData: MarketStructureData | null,
    bosChochData: BosChochData | null,
    liquidityData: LiquidityData | null,
    orderBlockData: OrderBlockData | null,
    fvgData: FvgData | null,
    priceActionData: PriceActionData | null,
    confluenceData: ConfluenceData | null,
    tradeScoreData: TradeScoreData | null,
    conflictData: ConflictData | null,
    stabilityData: StabilityData | null,
    mtfData: MultiTimeframeData | null,
    liveObs: LiveMarketObservation | null,
    currentPriceY: number | null,
    connectionData: ChartConnectionData | null,
    previousAIDecisionData: AIDecisionData | null,
    marketState?: MarketState | null
  ): Promise<AIDecisionData | null> {
    LoggerService.info('DecisionEngine: Evaluating MARS Decision Intelligence.');
    const timestamp = Date.now();
    
    // Safety checks
    if (!candles || candles.length === 0 || !currentPriceY || !confluenceData || !stabilityData || !tradeScoreData || !conflictData || !connectionData) {
      return previousAIDecisionData;
    }

    // Warmup check (3s fast warmup)
    const WARMUP_MS = 3000;
    if (connectionData.status === 'DISCONNECTED') {
      this.safeModeEndTime = timestamp + WARMUP_MS;
      return this.createSafeModeDecision(timestamp, 'Scanning Live Market...');
    }
    
    if (timestamp < this.safeModeEndTime) {
      return this.createSafeModeDecision(timestamp, 'Scanning Live Market...');
    }

    // Fetch self-calibrated thresholds and component weights (Phase 6 Self-Calibration)
    const calibrated = await SelfCalibrationEngine.getInstance().getCalibratedParameters();
    const weights = calibrated.weights;

    // -------------------------------------------------------------------------
    // PHASE 2: MULTI-FACTOR DYNAMIC WEIGHTED CONFIDENCE CALCULATION
    // -------------------------------------------------------------------------

    // Factor 1: Trend Quality (0-100)
    let trendScore = 50;
    const trendDir = trendData?.currentTrend?.direction;
    if (trendDir && trendDir !== 'sideways' && trendDir !== 'undefined') {
      trendScore = trendData?.currentTrend?.strength ?? 75;
    } else {
      trendScore = 30; // Sideways penalty
    }

    // Factor 2: Market Structure & SMC Alignment (0-100)
    let structureScore = marketStructureData?.structureStrength ?? 50;
    if (bosChochData?.latestBOS || bosChochData?.latestCHOCH) {
      structureScore = Math.min(100, structureScore + 20);
    }

    // Factor 3: Momentum & Acceleration (0-100)
    let momentumScore = 50;
    const momScore = trendData?.currentTrend?.momentumScore ?? 0;
    if (momScore > 15) momentumScore = 90;
    else if (momScore > 5) momentumScore = 75;
    else if (momScore < -10) momentumScore = 30;

    // Factor 4: Volatility Quality (0-100)
    let volatilityScore = 70;
    const avgHeight = trendData?.currentTrend?.averageCandleSize ?? 15;
    if (avgHeight > 45) volatilityScore = 35; // Extreme high volatility penalty
    else if (avgHeight < 5) volatilityScore = 40; // Extremely dead market penalty

    // Factor 5: Support / Resistance Reaction (0-100)
    let srScore = 50;
    if (supportResistanceData?.nearestSupport || supportResistanceData?.nearestResistance) {
      srScore = 80;
    }

    // Factor 6: Candle Behavior & Wick Exhaustion (0-100)
    const lastCandle = candles[candles.length - 1];
    let candleScore = 60;
    if (lastCandle) {
      const bodyRatio = lastCandle.totalHeight > 0 ? (lastCandle.bodySize / lastCandle.totalHeight) : 0.5;
      if (bodyRatio > 0.6) candleScore = 85; // Strong solid body
      else if (bodyRatio < 0.2) candleScore = 40; // Doji / Indecision
    }

    // Factor 7: Price Action Pattern Confirmation (0-100)
    let patternScore = 50;
    if (priceActionData?.latestPattern) {
      patternScore = priceActionData.latestPattern.patternStrength ?? 70;
    }

    // Weighted Normalized Sum
    let rawWeightedConfidence = 
      (trendScore * weights.trend) +
      (structureScore * weights.marketStructure) +
      (momentumScore * weights.momentum) +
      (volatilityScore * weights.volatility) +
      (srScore * weights.supportResistance) +
      (candleScore * weights.candleBehavior) +
      (patternScore * weights.priceAction);

    // Conflict & Trap Penalty
    if (conflictData.hasConflict) {
      rawWeightedConfidence -= 18;
    }

    // Normalize and Clamp final confidence score (50% to 98%)
    let dynamicConfidence = Math.max(50, Math.min(98, Math.round(rawWeightedConfidence)));

    // -------------------------------------------------------------------------
    // PHASE 3: ENTRY TIMING & MOVE EXHAUSTION CHECKS
    // -------------------------------------------------------------------------
    let isExhausted = false;
    const trendDuration = trendData?.currentTrend?.trendDuration ?? 0;
    
    // Exhaustion Condition: Move running for > 8 extended candles or price jammed right into opposite key level
    if (trendDuration >= 9) {
      isExhausted = true;
    }
    if (conflictData.hasConflict && conflictData.conflictReasons.some(r => r.toLowerCase().includes('exhaustion'))) {
      isExhausted = true;
    }

    if (isExhausted) {
      dynamicConfidence = Math.max(50, dynamicConfidence - 12);
    }

    // -------------------------------------------------------------------------
    // PHASE 1 & 4: SIGNAL CALIBRATION & HYSTERESIS STABILITY
    // -------------------------------------------------------------------------
    let candidateSignal: AIDecisionType = 'WAIT';

    if (dynamicConfidence >= calibrated.minEntryConfidenceThreshold && !isExhausted) {
      if (confluenceData.institutionalBias === 'bullish') candidateSignal = 'BUY';
      else if (confluenceData.institutionalBias === 'bearish') candidateSignal = 'SELL';
    }

    // Hysteresis & Anti-Oscillation Lock
    let finalSignal: AIDecisionType = candidateSignal;

    if (this.activeSignalState && (this.activeSignalState.signal === 'BUY' || this.activeSignalState.signal === 'SELL')) {
      const isLocked = timestamp < this.activeSignalState.lockUntil;
      const isConfidenceAboveDropThreshold = dynamicConfidence >= calibrated.dropConfidenceThreshold;
      const oppositeStructureBreak = bosChochData?.latestCHOCH?.direction && 
        ((this.activeSignalState.signal === 'BUY' && bosChochData.latestCHOCH.direction === 'bearish') ||
         (this.activeSignalState.signal === 'SELL' && bosChochData.latestCHOCH.direction === 'bullish'));

      if (isLocked && isConfidenceAboveDropThreshold && !oppositeStructureBreak) {
        finalSignal = this.activeSignalState.signal; // Maintain stable signal hysteresis
      } else {
        this.activeSignalState = null; // Release hysteresis lock
      }
    }

    if (finalSignal === 'BUY' || finalSignal === 'SELL') {
      if (!this.activeSignalState || this.activeSignalState.signal !== finalSignal) {
        this.activeSignalState = {
          signal: finalSignal,
          timestamp,
          lockUntil: timestamp + 25000, // 25s stability window
          entryConfidence: dynamicConfidence,
        };
      }
    }

    // -------------------------------------------------------------------------
    // PHASE 5: SMART WAIT REASONS (Trader-friendly 1-line reason)
    // -------------------------------------------------------------------------
    let waitReason = 'Scanning for High Probability Trade';
    if (finalSignal === 'WAIT') {
      if (isExhausted) {
        waitReason = 'Trend exhaustion - Late entry risk';
      } else if (trendDir === 'sideways') {
        waitReason = 'Sideways market';
      } else if (avgHeight > 40) {
        waitReason = 'High volatility';
      } else if (conflictData.hasConflict) {
        waitReason = 'Near key resistance';
      } else if (dynamicConfidence < 58) {
        waitReason = 'Weak momentum';
      } else {
        waitReason = 'Waiting for breakout';
      }
    }

    const positiveReasons: AIReason[] = confluenceData.supportingFactors.map((f, i) => ({
      id: `pos-${i}-${timestamp}`,
      decisionId: `AIDecision-${timestamp}`,
      priority: ReasonPriority.Primary,
      category: ReasonCategory.General,
      description: f.factor,
      moduleSource: f.module,
      evidence: f.factor,
      confidence: f.confidence,
      timestamp
    }));

    const negativeReasons: AIReason[] = confluenceData.rejectingFactors.map((f, i) => ({
      id: `neg-${i}-${timestamp}`,
      decisionId: `AIDecision-${timestamp}`,
      priority: ReasonPriority.Rejecting,
      category: ReasonCategory.General,
      description: f.factor,
      moduleSource: f.module,
      evidence: f.factor,
      confidence: f.confidence,
      timestamp
    }));

    const reasoning: AIReasoning = {
      decisionSummary: finalSignal !== 'WAIT'
        ? `${finalSignal} setup confirmed with ${dynamicConfidence}% confidence.`
        : waitReason,
      positiveReasons,
      negativeReasons,
      riskExplanation: conflictData.hasConflict ? `Caution: ${conflictData.conflictReasons[0]}` : 'Low risk setup',
      confidenceExplanation: `${dynamicConfidence}%`,
      institutionalSummary: confluenceData.institutionalBias,
      retailWarning: 'Confirm candle close before entry.',
      marketSummary: `Trend: ${trendData?.currentTrend?.direction ?? 'Sideways'}.`
    };

    const checklist = [
      { label: 'Trend Aligned', ok: Boolean(trendDir && trendDir !== 'sideways') },
      { label: 'Risk Acceptable', ok: !conflictData.hasConflict && !isExhausted },
      { label: 'Signal Stable', ok: dynamicConfidence >= calibrated.minEntryConfidenceThreshold }
    ];

    const isTradeAllowed = (finalSignal === 'BUY' || finalSignal === 'SELL');

    const aiDecisionData: AIDecisionData = {
      id: `AIDecision-${timestamp}`,
      signal: finalSignal,
      checklist,
      isTradeAllowed,
      confidence: dynamicConfidence,
      tradeScore: tradeScoreData.overallScore,
      bullishPercentage: tradeScoreData.bullishPercentage,
      bearishPercentage: tradeScoreData.bearishPercentage,
      riskLevel: tradeScoreData.riskScore,
      timestamp,
      institutionalBias: confluenceData.institutionalBias,
      expectedSuccessProbability: dynamicConfidence,
      entryQuality: isExhausted ? 45 : tradeScoreData.overallScore,
      summary: finalSignal !== 'WAIT' ? `Strong ${finalSignal} setup.` : waitReason,
      reasoning,
      unavailableReasons: [],
      recommendedExpiry: '1 MINUTE',
      entryRecommendation: isTradeAllowed ? 'YES' : 'WAIT',
      nearestDanger: conflictData.hasConflict ? conflictData.conflictReasons[0] : (isExhausted ? 'Move Exhausted' : 'None'),
    };

    // -------------------------------------------------------------------------
    // PHASE 6: LOG SIGNAL TO HISTORICAL ENGINE FOR SELF-CALIBRATION
    // -------------------------------------------------------------------------
    SignalAnalyticsService.getInstance().recordSignal({
      id: aiDecisionData.id,
      signal: aiDecisionData.signal,
      confidence: aiDecisionData.confidence,
      timestamp: aiDecisionData.timestamp,
      recommendedExpiry: aiDecisionData.recommendedExpiry,
      summary: aiDecisionData.summary,
      assetName: marketState?.assetName,
      timeframe: marketState?.timeframe,
      trend: trendDir,
    }).catch(() => {});
    
    this.lastAIDecisionData = aiDecisionData;
    return aiDecisionData;
  }
  
  private createSafeModeDecision(timestamp: number, reason: string): AIDecisionData {
    return {
      trendEvidence: 0,
      momentumEvidence: 0,
      structureEvidence: 0,
      patternEvidence: 0,
      liquidityEvidence: 0,
      volumeEvidence: 0,
      posteriorProbability: 0,
      evidenceCount: 0,
      lastBayesianUpdate: timestamp,
      id: `AIDecision-${timestamp}`,
      signal: 'WAIT',
      checklist: [],
      isTradeAllowed: false,
      confidence: 0,
      tradeScore: 0,
      bullishPercentage: 0,
      bearishPercentage: 0,
      riskLevel: 100,
      timestamp,
      institutionalBias: 'neutral',
      expectedSuccessProbability: 0,
      entryQuality: 0,
      summary: reason,
      reasoning: {
        decisionSummary: reason,
        positiveReasons: [],
        negativeReasons: [],
        riskExplanation: 'Scanning market...',
        confidenceExplanation: '0%',
        institutionalSummary: 'neutral',
        retailWarning: 'Scanning...',
        marketSummary: 'Scanning Live Market...'
      },
      unavailableReasons: [],
      recommendedExpiry: '1 MINUTE',
      entryRecommendation: 'WAIT',
      nearestDanger: 'None'
    };
  }
}
