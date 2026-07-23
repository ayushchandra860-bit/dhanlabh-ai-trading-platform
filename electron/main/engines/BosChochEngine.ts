import { LoggerService } from '../LoggerService';
import { config } from '../config';
import { 
  Candle, MarketState, SupportResistanceData, TrendData, 
  MarketStructureData, BosChochData, LiquidityData, OrderBlockData, 
  FvgData, PriceActionData, ConfluenceData, TradeScoreData, 
  AIDecisionData, AIReasoning, TrendDirection, ReasonCategory, ReasonPriority, AIReason, AIDecisionType
, SwingPoint, MarketStructureEvent } from '../vision';
import { OcrResult } from '../ocr';


export class BosChochEngine {
  public lastBosChochData: any = null;

  public analyzeBosChoch(
    candles: Candle[] | null,
    marketStructureData: MarketStructureData | null,
    _trendData: TrendData | null, // Not directly used in this phase, but part of input
    _supportResistanceData: SupportResistanceData | null, // Not directly used in this phase, but part of input
    currentPriceY: number | null,
    previousBosChochData: BosChochData | null
  ): BosChochData | null {
    LoggerService.info('VisionManager: Starting BOS + CHOCH Detection Engine.');

    if (!candles || candles.length < config.vision.minCandlesForMarketStructure || !marketStructureData || !marketStructureData.allSwingPoints || marketStructureData.allSwingPoints.length < 2 || currentPriceY === null) {
      LoggerService.warn('VisionManager: Insufficient candles, market structure data, or current price for BOS/CHOCH analysis. Returning null.');
      return null;
    }

    const analysisTimestamp = Date.now();
    const bosChochData: BosChochData = {
      latestBOS: null,
      latestCHOCH: null,
      bosHistory: previousBosChochData?.bosHistory ? [...previousBosChochData.bosHistory] : [],
      chochHistory: previousBosChochData?.chochHistory ? [...previousBosChochData.chochHistory] : [],
      currentStructureDirection: 'undefined',
      structureContinuation: 0,
      structureReversalProbability: 0,
      overallConfidence: 0,
    };

    const MIN_BREAK_PIXEL_DISTANCE = 2; // Minimum pixel distance for a break to be considered valid

    // Get the last processed candle index from previous data for incremental analysis
    const lastProcessedCandleIndex = bosChochData.bosHistory.length > 0
      ? Math.max(...bosChochData.bosHistory.map(e => e.breakingCandleIndex))
      : (bosChochData.chochHistory.length > 0
        ? Math.max(...bosChochData.chochHistory.map(e => e.breakingCandleIndex))
        : -1);

    // Iterate through swing points to find BOS/CHOCH
    // Start from the second swing point to compare with the previous one
    for (let i = 1; i < marketStructureData.allSwingPoints.length; i++) {
      const currentSwing = marketStructureData.allSwingPoints[i];
      const previousSwing = marketStructureData.allSwingPoints[i - 1];

      // Only process if the current swing point is new (i.e., its candleIndex is greater than the last processed)
      if (currentSwing.candleIndex <= lastProcessedCandleIndex) {
        continue;
      }

      let eventType: 'BOS' | 'CHOCH' | null = null;
      let eventDirection: 'bullish' | 'bearish' | null = null;
      let brokenSwingPoint: SwingPoint | null = null;

      // Determine BOS or CHOCH
      if (currentSwing.type === 'high') { // Current swing is a high
        if (previousSwing.type === 'high') {
          // Potential Bullish BOS: current high breaks above previous high (lower Y-coordinate)
          if (currentSwing.price < previousSwing.price - MIN_BREAK_PIXEL_DISTANCE) {
            eventType = 'BOS';
            eventDirection = 'bullish';
            brokenSwingPoint = previousSwing;
          }
        } else { // previousSwing.type === 'low'
          // Potential Bullish CHOCH: current high breaks above previous low (lower Y-coordinate)
          // This implies a reversal from a downtrend
          if (currentSwing.price < previousSwing.price - MIN_BREAK_PIXEL_DISTANCE) {
            eventType = 'CHOCH';
            eventDirection = 'bullish';
            brokenSwingPoint = previousSwing;
          }
        }
      } else { // currentSwing.type === 'low'
        if (previousSwing.type === 'low') {
          // Potential Bearish BOS: current low breaks below previous low (higher Y-coordinate)
          if (currentSwing.price > previousSwing.price + MIN_BREAK_PIXEL_DISTANCE) {
            eventType = 'BOS';
            eventDirection = 'bearish';
            brokenSwingPoint = previousSwing;
          }
        } else { // previousSwing.type === 'high'
          // Potential Bearish CHOCH: current low breaks below previous high (higher Y-coordinate)
          // This implies a reversal from an uptrend
          if (currentSwing.price > previousSwing.price + MIN_BREAK_PIXEL_DISTANCE) {
            eventType = 'CHOCH';
            eventDirection = 'bearish';
            brokenSwingPoint = previousSwing;
          }
        }
      }

      if (eventType && eventDirection && brokenSwingPoint) {
        const breakingCandle = candles[currentSwing.candleIndex];
        if (!breakingCandle) {
          LoggerService.warn(`VisionManager: Breaking candle not found for swing index ${currentSwing.candleIndex}. Skipping event.`);
          continue;
        }

        const breakDistance = Math.abs(currentSwing.price - brokenSwingPoint.price);
        // Heuristic for strength: combines break distance and swing strength
        const strength = Math.min(100, Math.round((breakDistance * 5) + (currentSwing.strength / 2)));
        // Heuristic for confidence: combines swing confidence and breaking candle confidence
        const confidence = Math.min(100, Math.round((currentSwing.confidence * 0.7) + (breakingCandle.confidence * 0.3)));

        // For this phase, the confirmation candle is the breaking candle itself.
        // In future phases, this could involve looking for subsequent closes or patterns.
        const confirmationCandleIndex = currentSwing.candleIndex;

        const event: MarketStructureEvent = {
          id: `${eventType}-${eventDirection}-${currentSwing.candleIndex}-${analysisTimestamp}`,
          eventType: eventType,
          direction: eventDirection,
          type: currentSwing.isMajor ? 'major' : 'minor', // Simplified for now, 'internal'/'external' can be added later
          price: brokenSwingPoint.price, // The price of the broken level
          brokenSwing: brokenSwingPoint,
          brokenCandleIndex: brokenSwingPoint.candleIndex,
          breakingCandleIndex: currentSwing.candleIndex,
          confirmationCandleIndex: confirmationCandleIndex,
          strength: strength,
          confidence: confidence,
          timestamp: analysisTimestamp,
          breakDistance: breakDistance,
        };

        if (eventType === 'BOS') {
          bosChochData.bosHistory.push(event);
          bosChochData.latestBOS = event;
        } else { // CHOCH
          bosChochData.chochHistory.push(event);
          bosChochData.latestCHOCH = event;
        }
      }
    }

    // Update overall structure direction and probabilities based on latest events
    if (bosChochData.latestCHOCH) {
      bosChochData.currentStructureDirection = bosChochData.latestCHOCH.direction === 'bullish' ? 'bullish' : 'bearish';
      bosChochData.structureReversalProbability = bosChochData.latestCHOCH.confidence;
      bosChochData.structureContinuation = 100 - bosChochData.latestCHOCH.confidence;
    } else if (bosChochData.latestBOS) {
      bosChochData.currentStructureDirection = bosChochData.latestBOS.direction === 'bullish' ? 'bullish' : 'bearish';
      bosChochData.structureContinuation = bosChochData.latestBOS.confidence;
      bosChochData.structureReversalProbability = 100 - bosChochData.latestBOS.confidence;
    } else {
      // If no BOS/CHOCH yet, derive from market structure
      bosChochData.currentStructureDirection = marketStructureData.currentStructure === 'bullish' ? 'bullish' : (marketStructureData.currentStructure === 'bearish' ? 'bearish' : 'ranging');
      bosChochData.structureContinuation = marketStructureData.structureConfidence;
      bosChochData.structureReversalProbability = 100 - marketStructureData.structureConfidence;
    }

    // Calculate overall confidence for BOS/CHOCH detection
    let totalConfidence = 0;
    let count = 0;
    if (bosChochData.latestBOS) {
      totalConfidence += bosChochData.latestBOS.confidence;
      count++;
    }
    if (bosChochData.latestCHOCH) {
      totalConfidence += bosChochData.latestCHOCH.confidence;
      count++;
    }
    bosChochData.overallConfidence = count > 0 ? Math.round(totalConfidence / count) : 0;

    LoggerService.info(`VisionManager: BOS/CHOCH analysis complete. Latest BOS: ${bosChochData.latestBOS?.id || 'None'}, Latest CHOCH: ${bosChochData.latestCHOCH?.id || 'None'}`);
    this.lastBosChochData = bosChochData; // Store for incremental analysis
    return bosChochData;
  }

}
