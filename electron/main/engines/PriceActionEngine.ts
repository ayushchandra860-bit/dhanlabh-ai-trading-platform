import { LoggerService } from '../LoggerService';
import { config } from '../config';
import { 
  Candle, MarketState, SupportResistanceData, TrendData, 
  MarketStructureData, BosChochData, LiquidityData, OrderBlockData, 
  FvgData, PriceActionData, ConfluenceData, PriceActionPattern, TradeScoreData, 
  AIDecisionData, AIReasoning, TrendDirection, ReasonCategory, ReasonPriority, AIReason, AIDecisionType, PatternType
} from '../vision';
import { OcrResult } from '../ocr';


export class PriceActionEngine {
  public lastPriceActionData: any = null;

  public analyzePriceAction(
    candles: Candle[] | null,
    trendData: TrendData | null,
    marketStructureData: MarketStructureData | null,
    bosChochData: BosChochData | null,
    liquidityData: LiquidityData | null,
    orderBlockData: OrderBlockData | null,
    fvgData: FvgData | null,
    currentPriceY: number | null,
    previousPriceActionData: PriceActionData | null
  ): PriceActionData | null {
    LoggerService.info('VisionManager: Starting Price Action Recognition Engine.');
    if (!candles || candles.length < 2 || currentPriceY === null) {
      return previousPriceActionData;
    }
    const timestamp = Date.now();
    const averageCandleSize = this.average(candles.map(candle => candle.totalHeight));
    const patternHistory: PriceActionPattern[] = [...(previousPriceActionData?.patternHistory ?? [])];
    const existingIds = new Set(patternHistory.map(pattern => pattern.id));
    const addPattern = (
      patternName: PriceActionPattern['patternName'] | any,
      direction: PriceActionPattern['direction'],
      start: number,
      end: number,
      price: number,
      baseStrength: number,
      confirmationCandleIndex: number | null = null
    ): void => {
      const trigger = candles[end];
      const id = `PA-${patternName}-${this.candleIndex(candles[start], start)}-${this.candleIndex(trigger, end)}`;
      if (existingIds.has(id)) return;
      const trendAligned = direction === 'bullish'
        ? this.isBullishTrend(trendData?.currentTrend?.direction)
        : (direction === 'bearish' ? this.isBearishTrend(trendData?.currentTrend?.direction) : false);
      const structureAligned = direction !== 'neutral' && marketStructureData?.currentStructure === direction;
      const eventAligned = direction !== 'neutral' && (bosChochData?.latestBOS?.direction === direction || bosChochData?.latestCHOCH?.direction === direction);
      const liquidityAligned = direction !== 'neutral' && liquidityData?.latestSweep?.direction === direction;
      const obAligned = direction === 'bullish' ? !!orderBlockData?.nearestBullishOrderBlock : (direction === 'bearish' ? !!orderBlockData?.nearestBearishOrderBlock : false);
      const fvgAligned = direction === 'bullish' ? !!fvgData?.nearestBullishFVG : (direction === 'bearish' ? !!fvgData?.nearestBearishFVG : false);
      const patternStrength = this.clampScore(baseStrength + (trendAligned ? 8 : 0) + (structureAligned ? 7 : 0) + (eventAligned ? 6 : 0) + (liquidityAligned ? 8 : 0) + (obAligned ? 5 : 0) + (fvgAligned ? 5 : 0));
      const confidence = this.clampScore(this.average(candles.slice(start, end + 1).map(candle => candle.confidence)) + patternStrength * 0.25);
      patternHistory.push({
        id,
        patternName,
        direction,
        patternStrength,
        confidence,
        startCandleIndex: this.candleIndex(candles[start], start),
        endCandleIndex: this.candleIndex(trigger, end),
        triggerCandleIndex: this.candleIndex(trigger, end),
        confirmationCandleIndex,
        price,
        timestamp,
        patternQuality: this.clampScore(patternStrength * 0.65 + confidence * 0.35),
        patternReliability: this.clampScore((patternName.includes('engulfing') || patternName.includes('star') ? 70 : 55) + (liquidityAligned ? 10 : 0) + (eventAligned ? 8 : 0)),
        reversalProbability: this.clampScore((patternName.includes('pin') || patternName.includes('hammer') || patternName.includes('star') || patternName.includes('engulfing') ? 62 : 35) + (liquidityAligned ? 12 : 0)),
        continuationProbability: this.clampScore((patternName === 'inside_bar' || patternName === 'outside_bar' || patternName.includes('soldiers') || patternName.includes('crows') ? 60 : 35) + (trendAligned ? 12 : 0)),
      });
      existingIds.add(id);
    };

    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const body = this.bodySize(candle);
      const range = Math.max(candle.totalHeight, 1);
      const upperWick = this.upperWickSize(candle);
      const lowerWick = this.lowerWickSize(candle);
      const bodyRatio = body / range;
      if (bodyRatio <= 0.1) addPattern('doji', 'neutral', i, i, candle.close, 45 + (upperWick + lowerWick) / range * 30);
      if (bodyRatio <= 0.18 && upperWick > range * 0.35 && lowerWick > range * 0.35) addPattern('long_legged_doji', 'neutral', i, i, candle.close, 58);
      if (lowerWick >= body * 2 && upperWick <= range * 0.25) addPattern(candle.direction === 'bearish' ? 'hammer' : 'bullish_pin_bar', 'bullish', i, i, candle.low, 58 + lowerWick / range * 25);
      if (upperWick >= body * 2 && lowerWick <= range * 0.25) addPattern(candle.direction === 'bullish' ? 'shooting_star' : 'bearish_pin_bar', 'bearish', i, i, candle.high, 58 + upperWick / range * 25);
      if (bodyRatio >= 0.82 && upperWick <= range * 0.1 && lowerWick <= range * 0.1) addPattern(candle.direction === 'bullish' ? 'marubozu_bullish' : 'marubozu_bearish', candle.direction === 'bullish' ? 'bullish' : 'bearish', i, i, candle.close, 62 + bodyRatio * 20);
      if (bodyRatio > 0.15 && bodyRatio < 0.35 && upperWick > body && lowerWick > body) addPattern('spinning_top', 'neutral', i, i, candle.close, 48);

      if (i >= 1) {
        const previous = candles[i - 1];
        const currentBodyTop = Math.min(candle.open, candle.close);
        const currentBodyBottom = Math.max(candle.open, candle.close);
        const previousBodyTop = Math.min(previous.open, previous.close);
        const previousBodyBottom = Math.max(previous.open, previous.close);
        if (previous.direction === 'bearish' && candle.direction === 'bullish' && currentBodyTop <= previousBodyTop && currentBodyBottom >= previousBodyBottom) {
          addPattern('bullish_engulfing', 'bullish', i - 1, i, candle.close, 68 + body / Math.max(averageCandleSize, 1) * 10);
        }
        if (previous.direction === 'bullish' && candle.direction === 'bearish' && currentBodyTop <= previousBodyTop && currentBodyBottom >= previousBodyBottom) {
          addPattern('bearish_engulfing', 'bearish', i - 1, i, candle.close, 68 + body / Math.max(averageCandleSize, 1) * 10);
        }
        if (candle.high >= previous.high && candle.low <= previous.low) addPattern('inside_bar', 'neutral', i - 1, i, candle.close, 50);
        if (candle.high <= previous.high && candle.low >= previous.low) addPattern('outside_bar', candle.direction === 'bullish' ? 'bullish' : 'bearish', i - 1, i, candle.close, 58);
        if (Math.abs(candle.high - previous.high) <= Math.max(2, averageCandleSize * 0.12)) addPattern('tweezer_top', 'bearish', i - 1, i, candle.high, 56);
        if (Math.abs(candle.low - previous.low) <= Math.max(2, averageCandleSize * 0.12)) addPattern('tweezer_bottom', 'bullish', i - 1, i, candle.low, 56);
      }

      if (i >= 2) {
        const a = candles[i - 2];
        const b = candles[i - 1];
        const c = candles[i];
        if (a.direction === 'bearish' && this.bodySize(b) <= averageCandleSize * 0.55 && c.direction === 'bullish' && c.close < (a.open + a.close) / 2) addPattern('morning_star', 'bullish', i - 2, i, c.close, 72, this.candleIndex(c, i));
        if (a.direction === 'bullish' && this.bodySize(b) <= averageCandleSize * 0.55 && c.direction === 'bearish' && c.close > (a.open + a.close) / 2) addPattern('evening_star', 'bearish', i - 2, i, c.close, 72, this.candleIndex(c, i));
        if (a.direction === 'bullish' && b.direction === 'bullish' && c.direction === 'bullish') addPattern('three_white_soldiers', 'bullish', i - 2, i, c.close, 65);
        if (a.direction === 'bearish' && b.direction === 'bearish' && c.direction === 'bearish') addPattern('three_black_crows', 'bearish', i - 2, i, c.close, 65);
      }
    }

    // --- Phase 1 Additions: Geometry Pattern Recognition ---
    if (marketStructureData?.allSwingPoints && marketStructureData.allSwingPoints.length >= 3) {
      const swings = marketStructureData.allSwingPoints;
      const len = swings.length;
      
      const last1 = swings[len - 1];
      const last2 = swings[len - 2];
      const last3 = swings[len - 3];
      
      if (len >= 3 && last1.type === 'high' && last3.type === 'high' && last2.type === 'low') {
        if (Math.abs(last1.price - last3.price) < Math.max(5, averageCandleSize * 0.5)) {
          addPattern('double_top', 'bearish', last3.candleIndex, last1.candleIndex, last1.price, 70);
        }
      }
      if (len >= 3 && last1.type === 'low' && last3.type === 'low' && last2.type === 'high') {
        if (Math.abs(last1.price - last3.price) < Math.max(5, averageCandleSize * 0.5)) {
          addPattern('double_bottom', 'bullish', last3.candleIndex, last1.candleIndex, last1.price, 70);
        }
      }
      
      if (len >= 5) {
        const last5 = swings[len - 5];
        if (last1.type === 'high' && last3.type === 'high' && last5.type === 'high') {
          // Pixel coordinates: smaller Y = higher price
          if (last3.price < last1.price && last3.price < last5.price && Math.abs(last1.price - last5.price) < Math.max(10, averageCandleSize)) {
            addPattern('head_and_shoulders', 'bearish', last5.candleIndex, last1.candleIndex, last1.price, 80);
          }
        }
        if (last1.type === 'low' && last3.type === 'low' && last5.type === 'low') {
          // Pixel coordinates: larger Y = lower price
          if (last3.price > last1.price && last3.price > last5.price && Math.abs(last1.price - last5.price) < Math.max(10, averageCandleSize)) {
            addPattern('inverse_head_and_shoulders', 'bullish', last5.candleIndex, last1.candleIndex, last1.price, 80);
          }
        }
      }
      
      if (marketStructureData.higherLows.length >= 2 && marketStructureData.lowerHighs.length >= 2) {
         addPattern('triangle_pennant', 'neutral', last3.candleIndex, last1.candleIndex, last1.price, 60);
      }
      
      // Flags (Bullish Flag: lower highs and lower lows after a strong impulse)
      if (marketStructureData.lowerHighs.length >= 2 && marketStructureData.lowerLows.length >= 2 && trendData?.currentTrend?.direction.includes('uptrend')) {
         addPattern('bullish_flag', 'bullish', last3.candleIndex, last1.candleIndex, last1.price, 65);
      }
      // Bearish Flag
      if (marketStructureData.higherHighs.length >= 2 && marketStructureData.higherLows.length >= 2 && trendData?.currentTrend?.direction.includes('downtrend')) {
         addPattern('bearish_flag', 'bearish', last3.candleIndex, last1.candleIndex, last1.price, 65);
      }
    }

    const latestPattern = patternHistory.sort((a, b) => b.endCandleIndex - a.endCandleIndex)[0] ?? null;
    const highestConfidencePattern = [...patternHistory].sort((a, b) => b.confidence - a.confidence)[0] ?? null;
    const bullishPatternList = patternHistory.filter(pattern => pattern.direction === 'bullish');
    const bearishPatternList = patternHistory.filter(pattern => pattern.direction === 'bearish');
    
    const priceActionData: PriceActionData = {
      latestPattern,
      patternHistory,
      bullishPatternList,
      bearishPatternList,
      highestConfidencePattern,
      priceActionSummary: `Detected ${patternHistory.length} price action patterns. Latest: ${latestPattern?.patternName ?? 'none'}.`,
      overallConfidence: this.clampScore(this.average(patternHistory.slice(-10).map(pattern => pattern.confidence))),
    };

    // --- Phase 1 Additions: Unified Structure Score ---
    let structureScore = 50;
    
    if (bosChochData) {
      if (bosChochData.latestBOS?.direction === 'bullish') structureScore += 10;
      else if (bosChochData.latestBOS?.direction === 'bearish') structureScore -= 10;
      if (bosChochData.latestCHOCH?.direction === 'bullish') structureScore += 15;
      else if (bosChochData.latestCHOCH?.direction === 'bearish') structureScore -= 15;
    }
    
    if (orderBlockData) {
      if (orderBlockData.nearestBullishOrderBlock) structureScore += 10;
      if (orderBlockData.nearestBearishOrderBlock) structureScore -= 10;
    }
    
    if (fvgData) {
      if (fvgData.nearestBullishFVG) structureScore += 5;
      if (fvgData.nearestBearishFVG) structureScore -= 5;
    }
    
    if (liquidityData) {
      if (liquidityData.latestSweep?.direction === 'bullish') structureScore += 10;
      else if (liquidityData.latestSweep?.direction === 'bearish') structureScore -= 10;
    }
    
    structureScore = this.clampScore(structureScore);
    (priceActionData as any).structureScore = structureScore;

    this.lastPriceActionData = priceActionData;
    return priceActionData;
  }

  public candleIndex(candle: Candle, fallback: number): number {
    return candle.candleIndex ?? fallback;
  }

  public bodySize(candle: Candle): number {
    return Math.abs(candle.open - candle.close);
  }

  public upperWickSize(candle: Candle): number {
    return Math.max(0, Math.min(candle.open, candle.close) - candle.high);
  }

  public lowerWickSize(candle: Candle): number {
    return Math.max(0, candle.low - Math.max(candle.open, candle.close));
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


  private isBullishTrend(trendData: any): boolean {
    return trendData === 'bullish' || trendData === 'strong_uptrend' || trendData === 'weak_uptrend';
  }

  private isBearishTrend(trendData: any): boolean {
    return trendData === 'bearish' || trendData === 'strong_downtrend' || trendData === 'weak_downtrend';
  }

}
