import { LoggerService } from '../LoggerService';
import { config } from '../config';
import { 
  Candle, MarketState, SupportResistanceData, TrendData, 
  MarketStructureData, BosChochData, LiquidityData, OrderBlockData, SwingPoint, 
  FvgData, PriceActionData, ConfluenceData, TradeScoreData, 
  AIDecisionData, AIReasoning, TrendDirection, ReasonCategory, ReasonPriority, AIReason, AIDecisionType
} from '../vision';
import { OcrResult } from '../ocr';


export class MarketStructureEngine {
  public lastMarketStructureData: any = null;

  public analyzeMarketStructure(
    candles: Candle[] | null,
    trendData: TrendData | null,
    _supportResistanceData: SupportResistanceData | null,
    currentPriceY: number | null,
    _previousMarketStructureData: MarketStructureData | null
  ): MarketStructureData | null {
    LoggerService.info('VisionManager: Starting Market Structure Engine.');

    if (!candles || candles.length < config.vision.minCandlesForStructureAnalysis || currentPriceY === null) {
      LoggerService.warn('VisionManager: Insufficient candles or current price for market structure analysis. Returning null.');
      return null;
    }

    const analysisTimestamp = Date.now();
    const marketStructureData: MarketStructureData = {
      currentStructure: 'undefined',
      structureStrength: 0,
      structureConfidence: 0,
      latestSwingHigh: null,
      latestSwingLow: null,
      higherHighs: [],
      higherLows: [],
      lowerHighs: [],
      lowerLows: [],
      allSwingPoints: [],
      structureSummary: 'Undefined market structure.',
    };

    // Configuration for swing point detection
    const SWING_LOOKBACK = 3; // Number of candles to look left/right to confirm a swing
    const MIN_SWING_PIXEL_HEIGHT = 5; // Minimum pixel height difference for a swing to be considered valid

    const potentialSwingPoints: SwingPoint[] = [];

    // 1. Detect Swing Highs and Swing Lows
    for (let i = SWING_LOOKBACK; i < candles.length - SWING_LOOKBACK; i++) {
      const currentCandle = candles[i];
      if (currentCandle.candleIndex === undefined) continue;

      const leftCandles = candles.slice(i - SWING_LOOKBACK, i);
      const rightCandles = candles.slice(i + 1, i + SWING_LOOKBACK + 1);

      const isSwingHigh = leftCandles.every(c => currentCandle.high <= c.high) &&
                          rightCandles.every(c => currentCandle.high <= c.high);
      if (isSwingHigh) {
        potentialSwingPoints.push({
          id: `SH-${currentCandle.candleIndex}-${currentCandle.high}`,
          candleIndex: currentCandle.candleIndex,
          price: currentCandle.high,
          type: 'high',
          isMajor: false,
          strength: 0,
          confidence: currentCandle.confidence,
          timestamp: analysisTimestamp,
        });
      }

      const isSwingLow = leftCandles.every(c => currentCandle.low >= c.low) &&
                         rightCandles.every(c => currentCandle.low >= c.low);
      if (isSwingLow) {
        potentialSwingPoints.push({
          id: `SL-${currentCandle.candleIndex}-${currentCandle.low}`,
          candleIndex: currentCandle.candleIndex,
          price: currentCandle.low,
          type: 'low',
          isMajor: false,
          strength: 0,
          confidence: currentCandle.confidence,
          timestamp: analysisTimestamp,
        });
      }
    }

    potentialSwingPoints.sort((a, b) => a.candleIndex - b.candleIndex);

    const filteredSwingPoints: SwingPoint[] = [];
    if (potentialSwingPoints.length > 0) {
      filteredSwingPoints.push(potentialSwingPoints[0]);

      for (let i = 1; i < potentialSwingPoints.length; i++) {
        const currentSwing = potentialSwingPoints[i];
        const lastFilteredSwing = filteredSwingPoints[filteredSwingPoints.length - 1];

        if (Math.abs(currentSwing.price - lastFilteredSwing.price) < MIN_SWING_PIXEL_HEIGHT) {
          if (currentSwing.confidence > lastFilteredSwing.confidence) {
            filteredSwingPoints[filteredSwingPoints.length - 1] = currentSwing;
          }
          continue;
        }

        const priceDiff = Math.abs(currentSwing.price - lastFilteredSwing.price);
        currentSwing.strength = Math.min(100, Math.round(priceDiff / MIN_SWING_PIXEL_HEIGHT) * 10);
        currentSwing.isMajor = currentSwing.strength > 50;

        filteredSwingPoints.push(currentSwing);
      }
    }
    marketStructureData.allSwingPoints = filteredSwingPoints;

    let lastHigh: SwingPoint | null = null;
    let lastLow: SwingPoint | null = null;

    for (const swing of filteredSwingPoints) {
      if (swing.type === 'high') {
        if (lastHigh && swing.price < lastHigh.price) {
          marketStructureData.higherHighs.push(swing);
        } else if (lastHigh && swing.price > lastHigh.price) {
          marketStructureData.lowerHighs.push(swing);
        }
        lastHigh = swing;
      } else {
        if (lastLow && swing.price < lastLow.price) {
          marketStructureData.higherLows.push(swing);
        } else if (lastLow && swing.price > lastLow.price) {
          marketStructureData.lowerLows.push(swing);
        }
        lastLow = swing;
      }
    }

    marketStructureData.latestSwingHigh = lastHigh;
    marketStructureData.latestSwingLow = lastLow;

    const numHH = marketStructureData.higherHighs.length;
    const numHL = marketStructureData.higherLows.length;
    const numLH = marketStructureData.lowerHighs.length;
    const numLL = marketStructureData.lowerLows.length;

    if (numHH >= 2 && numHL >= 2 && numHH > numLH && numHL > numLL) {
      marketStructureData.currentStructure = 'bullish';
      marketStructureData.structureStrength = Math.min(100, (numHH + numHL) * 20);
      marketStructureData.structureConfidence = Math.min(100, (numHH + numHL) * 15);
      marketStructureData.structureSummary = 'Strong Bullish Market Structure (HH & HL sequence).';
    } else if (numLH >= 2 && numLL >= 2 && numLH > numHH && numLL > numHL) {
      marketStructureData.currentStructure = 'bearish';
      marketStructureData.structureStrength = Math.min(100, (numLH + numLL) * 20);
      marketStructureData.structureConfidence = Math.min(100, (numLH + numLL) * 15);
      marketStructureData.structureSummary = 'Strong Bearish Market Structure (LH & LL sequence).';
    } else if (numHH >= 1 && numHL >= 1 && numLH >= 1 && numLL >= 1) {
      marketStructureData.currentStructure = 'range';
      marketStructureData.structureStrength = 30;
      marketStructureData.structureConfidence = 60;
      marketStructureData.structureSummary = 'Ranging Market Structure (mixed HH/HL/LH/LL).';
    } else {
      marketStructureData.currentStructure = 'undefined';
      marketStructureData.structureStrength = 10;
      marketStructureData.structureConfidence = 20;
      marketStructureData.structureSummary = 'Undefined Market Structure (insufficient clear patterns).';
    }

    if (trendData?.currentTrend) {
      if (marketStructureData.currentStructure === 'bullish' && trendData.currentTrend.direction.includes('uptrend')) {
        marketStructureData.structureStrength = Math.min(100, marketStructureData.structureStrength + trendData.currentTrend.strength / 2);
        marketStructureData.structureConfidence = Math.min(100, marketStructureData.structureConfidence + trendData.currentTrend.confidence / 2);
      } else if (marketStructureData.currentStructure === 'bearish' && trendData.currentTrend.direction.includes('downtrend')) {
        marketStructureData.structureStrength = Math.min(100, marketStructureData.structureStrength + trendData.currentTrend.strength / 2);
        marketStructureData.structureConfidence = Math.min(100, marketStructureData.structureConfidence + trendData.currentTrend.confidence / 2);
      } else if (marketStructureData.currentStructure === 'range' && (trendData.currentTrend.direction === 'sideways' || trendData.currentTrend.direction === 'range_market')) {
        marketStructureData.structureStrength = Math.min(100, marketStructureData.structureStrength + trendData.currentTrend.strength / 2);
        marketStructureData.structureConfidence = Math.min(100, marketStructureData.structureConfidence + trendData.currentTrend.confidence / 2);
      }
    }

    let isVolatilityExpansion = false;
    let isVolatilityCompression = false;
    if (candles.length > 10) {
      const recentCandles = candles.slice(-5);
      const pastCandles = candles.slice(-15, -5);
      
      const avgRecentSize = recentCandles.reduce((sum, c) => sum + (c.totalHeight || 0), 0) / recentCandles.length;
      const avgPastSize = pastCandles.reduce((sum, c) => sum + (c.totalHeight || 0), 0) / (pastCandles.length || 1);
      
      if (avgRecentSize > avgPastSize * 1.5) {
        isVolatilityExpansion = true;
        marketStructureData.structureSummary += ' Volatility is Expanding.';
      } else if (avgRecentSize < avgPastSize * 0.6) {
        isVolatilityCompression = true;
        marketStructureData.structureSummary += ' Volatility is Compressing (Squeeze).';
      }
    }

    let isPullback = false;
    let isReversal = false;

    if (marketStructureData.currentStructure === 'bullish') {
      const recentCandles = candles.slice(-3);
      const againstTrend = recentCandles.filter(c => c.direction === 'bearish').length;
      if (againstTrend >= 2) {
        isPullback = true;
        marketStructureData.structureSummary += ' Current price action indicates a Pullback.';
      }
      
      if (numLH >= 1 && numLL >= 1 && lastHigh && lastLow) {
        isReversal = true;
        marketStructureData.structureSummary += ' Potential Reversal detected (Lower highs/lows forming).';
      }
    } else if (marketStructureData.currentStructure === 'bearish') {
      const recentCandles = candles.slice(-3);
      const againstTrend = recentCandles.filter(c => c.direction === 'bullish').length;
      if (againstTrend >= 2) {
        isPullback = true;
        marketStructureData.structureSummary += ' Current price action indicates a Pullback.';
      }
      
      if (numHH >= 1 && numHL >= 1 && lastHigh && lastLow) {
        isReversal = true;
        marketStructureData.structureSummary += ' Potential Reversal detected (Higher highs/lows forming).';
      }
    }

    (marketStructureData as any).isVolatilityExpansion = isVolatilityExpansion;
    (marketStructureData as any).isVolatilityCompression = isVolatilityCompression;
    (marketStructureData as any).isPullback = isPullback;
    (marketStructureData as any).isReversal = isReversal;

    LoggerService.info(`VisionManager: Market Structure analysis complete. Structure: ${marketStructureData.currentStructure}, Summary: ${marketStructureData.structureSummary}`);
    this.lastMarketStructureData = marketStructureData;
    return marketStructureData;
  }
}
