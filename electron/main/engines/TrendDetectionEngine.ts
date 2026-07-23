// @ts-nocheck
import { LoggerService } from '../LoggerService';
import { config } from '../config';
import { 
  Candle, MarketState, SupportResistanceData, TrendData, 
  MarketStructureData, BosChochData, LiquidityData, OrderBlockData, 
  FvgData, PriceActionData, ConfluenceData, TradeScoreData, 
  AIDecisionData, AIReasoning, TrendDirection, ReasonCategory, ReasonPriority, AIReason, AIDecisionType
} from '../vision';
import { OcrResult } from '../ocr';


export class TrendDetectionEngine {
  public lastTrendData: any = null;

  public analyzeTrend(
    candles: Candle[] | null,
    supportResistanceData: SupportResistanceData | null,
    currentPriceY: number | null,
    previousTrendData: TrendData | null
  ): TrendData | null {
    LoggerService.info('VisionManager: Starting Trend Detection Engine.');

    if (!candles || candles.length < config.vision.minCandlesForTrendDetection || currentPriceY === null) {
      LoggerService.warn('VisionManager: Insufficient candles or current price for trend analysis. Returning null.');
      return null;
    }

    const analysisTimestamp = Date.now();
    const trendData: TrendData = {
      currentTrend: null,
      trendSummary: 'Undefined',
      bullBearControl: 'undefined',
    };

    // --- Helper functions for trend analysis ---

    // Calculate average candle size (total height)
    const calculateAverageCandleSize = (c: Candle[]): number => {
      if (c.length === 0) return 0;
      return c.reduce((sum, candle) => sum + candle.totalHeight, 0) / c.length;
    };

    const calculateEMA = (values: number[], period: number): number[] => {
      if (values.length === 0) return values;
      const multiplier = 2 / (period + 1);
      const ema: number[] = [values[0]];
      for (let i = 1; i < values.length; i++) {
        ema.push((values[i] - ema[i - 1]) * multiplier + ema[i - 1]);
      }
      return ema;
    };

    // Calculate Bull/Bear dominance
    const calculateBullBearDominance = (c: Candle[]): number => {
      let bullishCount = 0;
      let bearishCount = 0;
      for (const candle of c) {
        if (candle.direction === 'bullish') bullishCount++;
        else if (candle.direction === 'bearish') bearishCount++;
      }
      return bullishCount - bearishCount; // Positive for bull dominance, negative for bear dominance
    };

    // Calculate momentum score (sum of price change in trend direction)
    const calculateMomentumScore = (c: Candle[]): number => {
      return c.reduce((sum, candle) => {
        if (candle.direction === 'bullish') {
          return sum + (candle.open - candle.close); // Lower Y is higher price, so open - close is positive for bullish
        } else if (candle.direction === 'bearish') {
          return sum + (candle.close - candle.open); // Close - open is positive for bearish
        }
        return sum;
      }, 0);
    };

    // Simple linear regression slope calculation
    const calculateSlope = (c: Candle[]): number => {
      if (c.length < 2) return 0;
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumX2 = 0;
      const n = c.length;

      for (let i = 0; i < n; i++) {
        const x = i; // Use index as x-coordinate
        const y = c[i].close; // Use close price (pixel Y) as y-coordinate
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      }

      const numerator = (n * sumXY) - (sumX * sumY);
      const denominator = (n * sumX2) - (sumX * sumX);

      return denominator === 0 ? 0 : numerator / denominator;
    };

    const calculateDirectionalImpulse = (c: Candle[], bullish: boolean): number => {
      return c.reduce((sum, candle) => {
        if (bullish && candle.direction === 'bullish') return sum + this.bodySize(candle);
        if (!bullish && candle.direction === 'bearish') return sum + this.bodySize(candle);
        return sum;
      }, 0);
    };

    const calculateDirectionalPullback = (c: Candle[], bullish: boolean): number => {
      return c.reduce((sum, candle) => {
        if (bullish && candle.direction === 'bearish') return sum + this.bodySize(candle);
        if (!bullish && candle.direction === 'bullish') return sum + this.bodySize(candle);
        return sum;
      }, 0);
    };

    // --- Trend Detection Logic ---

    // Simplified Swing Point Detection for trend analysis (more robust than S&R for trend)
    const SWING_POINT_LOOKBACK = 3; // Look 3 candles left and right
    const swingHighs: Candle[] = [];
    const swingLows: Candle[] = [];

    for (let i = SWING_POINT_LOOKBACK; i < candles.length - SWING_POINT_LOOKBACK; i++) {
      const current = candles[i];
      const isHigh = candles.slice(i - SWING_POINT_LOOKBACK, i).every(c => current.high <= c.high) &&
                     candles.slice(i + 1, i + SWING_POINT_LOOKBACK + 1).every(c => current.high <= c.high);
      const isLow = candles.slice(i - SWING_POINT_LOOKBACK, i).every(c => current.low >= c.low) &&
                    candles.slice(i + 1, i + SWING_POINT_LOOKBACK + 1).every(c => current.low >= c.low);

      if (isHigh) swingHighs.push(current);
      if (isLow) swingLows.push(current);
    }

    let currentTrendDirection: TrendDirection = 'undefined';
    let trendStrength = 0;
    let trendConfidence = 0;
    let startedCandleIndex = 0;
    const latestCandleIndex = candles.length - 1;

    const closes = candles.map(candle => candle.close);
    const emaFast = calculateEMA(closes, Math.min(8, Math.max(2, candles.length)));
    const emaSlow = calculateEMA(closes, Math.min(21, Math.max(3, candles.length)));
    const lastFast = emaFast[emaFast.length - 1] ?? closes[closes.length - 1];
    const lastSlow = emaSlow[emaSlow.length - 1] ?? closes[closes.length - 1];
    const slope = calculateSlope(candles);
    const recentCandles = candles.slice(-Math.min(candles.length, Math.max(config.vision.minCandlesForTrendDetection, 12)));
    const averageCandleSize = calculateAverageCandleSize(recentCandles);
    const dominance = calculateBullBearDominance(recentCandles);
    const momentumScore = calculateMomentumScore(recentCandles);
    const emaBias = lastFast < lastSlow ? 'bullish' : (lastFast > lastSlow ? 'bearish' : 'neutral');

    // Analyze recent swing points to determine trend from HH/HL/LH/LL sequences.
    if (swingHighs.length >= 2 && swingLows.length >= 2) {
      const lastTwoHighs = swingHighs.slice(-2);
      const lastTwoLows = swingLows.slice(-2);

      if (lastTwoHighs.length === 2 && lastTwoLows.length === 2) {
        const isHigherHigh = lastTwoHighs[1].high < lastTwoHighs[0].high; // Lower Y is higher price
        const isHigherLow = lastTwoLows[1].low < lastTwoLows[0].low; // Lower Y is higher price
        const isLowerHigh = lastTwoHighs[1].high > lastTwoHighs[0].high; // Higher Y is lower price
        const isLowerLow = lastTwoLows[1].low > lastTwoLows[0].low; // Higher Y is lower price

        const sequenceScore = (isHigherHigh ? 25 : 0) + (isHigherLow ? 25 : 0) + (emaBias === 'bullish' ? 20 : 0) + (slope < 0 ? 15 : 0) + Math.max(0, dominance) * 3;
        const bearishSequenceScore = (isLowerHigh ? 25 : 0) + (isLowerLow ? 25 : 0) + (emaBias === 'bearish' ? 20 : 0) + (slope > 0 ? 15 : 0) + Math.max(0, -dominance) * 3;

        if (isHigherHigh && isHigherLow) {
          currentTrendDirection = sequenceScore >= 70 ? 'strong_uptrend' : 'weak_uptrend';
          trendStrength = this.clampScore(sequenceScore + momentumScore / Math.max(averageCandleSize, 1));
          trendConfidence = this.clampScore((lastTwoHighs[1].confidence + lastTwoLows[1].confidence) / 2 + (emaBias === 'bullish' ? 12 : 0));
          startedCandleIndex = Math.min(this.candleIndex(lastTwoHighs[0], 0), this.candleIndex(lastTwoLows[0], 0));
        } else if (isLowerHigh && isLowerLow) {
          currentTrendDirection = bearishSequenceScore >= 70 ? 'strong_downtrend' : 'weak_downtrend';
          trendStrength = this.clampScore(bearishSequenceScore + momentumScore / Math.max(averageCandleSize, 1));
          trendConfidence = this.clampScore((lastTwoHighs[1].confidence + lastTwoLows[1].confidence) / 2 + (emaBias === 'bearish' ? 12 : 0));
          startedCandleIndex = Math.min(this.candleIndex(lastTwoHighs[0], 0), this.candleIndex(lastTwoLows[0], 0));
        } else {
          const rangeStrength = this.average([Math.abs(dominance) < 3 ? 60 : 40, Math.abs(lastFast - lastSlow) <= averageCandleSize ? 60 : 35]);
          currentTrendDirection = rangeStrength >= 55 ? 'range_market' : 'sideways';
          trendStrength = this.clampScore(rangeStrength);
          trendConfidence = this.clampScore(45 + Math.min(30, swingHighs.length + swingLows.length));
        }
      }
    }

    // If still undefined, check for simple directional bias
    if (currentTrendDirection === 'undefined') {
      if (dominance > 2 || slope < -0.2 || emaBias === 'bullish') {
        const score = Math.max(Math.max(0, dominance) * 8, Math.abs(slope) * 18, emaBias === 'bullish' ? 45 : 0);
        currentTrendDirection = score >= 65 ? 'strong_uptrend' : 'weak_uptrend';
        trendStrength = this.clampScore(score);
        trendConfidence = this.clampScore(45 + Math.min(35, Math.abs(dominance) * 6) + (emaBias === 'bullish' ? 10 : 0));
      } else if (dominance < -2 || slope > 0.2 || emaBias === 'bearish') {
        const score = Math.max(Math.max(0, -dominance) * 8, Math.abs(slope) * 18, emaBias === 'bearish' ? 45 : 0);
        currentTrendDirection = score >= 65 ? 'strong_downtrend' : 'weak_downtrend';
        trendStrength = this.clampScore(score);
        trendConfidence = this.clampScore(45 + Math.min(35, Math.abs(dominance) * 6) + (emaBias === 'bearish' ? 10 : 0));
      } else {
        currentTrendDirection = 'range_market';
        trendStrength = this.clampScore(25 + (supportResistanceData?.nearestSupport && supportResistanceData?.nearestResistance ? 20 : 0));
        trendConfidence = this.clampScore(40 + (previousTrendData?.currentTrend?.direction === 'range_market' ? 10 : 0));
      }
    }

    const bullishTrend = this.isBullishTrend(currentTrendDirection);
    const bearishTrend = this.isBearishTrend(currentTrendDirection);
    const impulseStrength = bullishTrend ? calculateDirectionalImpulse(recentCandles, true) : (bearishTrend ? calculateDirectionalImpulse(recentCandles, false) : momentumScore);
    const pullbackStrength = bullishTrend ? calculateDirectionalPullback(recentCandles, true) : (bearishTrend ? calculateDirectionalPullback(recentCandles, false) : Math.abs(momentumScore - impulseStrength));
    const latestCandle = candles[candles.length - 1];
    const currentPhase: Trend['currentPhase'] = trendStrength < 35
      ? 'consolidation'
      : ((bullishTrend && latestCandle.direction === 'bearish') || (bearishTrend && latestCandle.direction === 'bullish')
        ? (pullbackStrength > impulseStrength * 0.8 ? 'reversal_attempt' : 'pullback')
        : 'impulse');

    const currentTrend: Trend = {
      id: `trend-${analysisTimestamp}`,
      direction: currentTrendDirection,
      strength: trendStrength,
      confidence: trendConfidence,
      startedCandleIndex: startedCandleIndex,
      latestCandleIndex: this.candleIndex(latestCandle, latestCandleIndex),
      timestamp: analysisTimestamp,
      momentumScore: this.clampScore(momentumScore),
      slope,
      impulseStrength: this.clampScore(impulseStrength / Math.max(averageCandleSize, 1) * 10),
      pullbackStrength: this.clampScore(pullbackStrength / Math.max(averageCandleSize, 1) * 10),
      averageCandleSize,
      bullBearDominance: dominance,
      trendDuration: recentCandles.length,
      currentPhase,
    };

    trendData.currentTrend = currentTrend;
    trendData.trendSummary = `Current trend: ${currentTrend.direction} with strength ${currentTrend.strength} and confidence ${currentTrend.confidence}.`;
    trendData.bullBearControl = currentTrend.bullBearDominance > 0 ? 'bulls' : (currentTrend.bullBearDominance < 0 ? 'bears' : 'neutral');

    LoggerService.info(`VisionManager: Trend analysis complete. Direction: ${trendData.currentTrend?.direction}, Strength: ${trendData.currentTrend?.strength}`);
    this.lastTrendData = trendData; // Store for incremental analysis in future phases
    return trendData;
  }

  public isBullishTrend(direction: TrendDirection | undefined): boolean {
    return direction === 'strong_uptrend' || direction === 'weak_uptrend' || direction === 'accumulation';
  }

  public isBearishTrend(direction: TrendDirection | undefined): boolean {
    return direction === 'strong_downtrend' || direction === 'weak_downtrend' || direction === 'distribution';
  }


  private clampScore(score: number): number {
    if (isNaN(score)) return 0;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private average(arr: number[]): number {
    if (!arr || arr.length === 0) return 0;
    const valid = arr.filter(n => !isNaN(n));
    if (valid.length === 0) return 0;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  }

  private distanceQuality(distance: number, averageCandleSize: number): number {
    if (averageCandleSize <= 0) return 50;
    const ratio = distance / averageCandleSize;
    if (ratio < 1) return 100;
    if (ratio < 3) return 80;
    if (ratio < 5) return 60;
    if (ratio < 10) return 40;
    return 20;
  }

  private bodySize(candle: any): number {
    return Math.abs((candle.open ?? 0) - (candle.close ?? 0));
  }

  private isBullishTrend(trendData: any): boolean {
    return trendData?.currentTrend?.direction === 'bullish';
  }

  private isBearishTrend(trendData: any): boolean {
    return trendData?.currentTrend?.direction === 'bearish';
  }


  private candleIndex(candle: any, defaultIndex: number): number {
    return candle && typeof candle.index === 'number' ? candle.index : defaultIndex;
  }

}
