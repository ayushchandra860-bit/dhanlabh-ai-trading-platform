import { LoggerService } from '../LoggerService';
import { config } from '../config';
import { 
  Candle, MarketState, SupportResistanceData, TrendData, 
  MarketStructureData, BosChochData, LiquidityData, OrderBlockData, 
  FvgData, PriceActionData, ConfluenceData, TradeScoreData, 
  AIDecisionData, AIReasoning, TrendDirection, ReasonCategory, ReasonPriority, AIReason, AIDecisionType
, FairValueGap } from '../vision';
import { OcrResult } from '../ocr';


export class FvgEngine {
  public lastFvgData: any = null;

  public analyzeFairValueGaps(
    candles: Candle[] | null,
    trendData: TrendData | null,
    marketStructureData: MarketStructureData | null,
    bosChochData: BosChochData | null,
    liquidityData: LiquidityData | null,
    orderBlockData: OrderBlockData | null,
    currentPriceY: number | null,
    previousFvgData: FvgData | null
  ): FvgData | null {
    LoggerService.info('VisionManager: Starting Fair Value Gap (FVG) & Imbalance Engine.');
    if (!candles || candles.length < 3 || currentPriceY === null) {
      return previousFvgData;
    }
    const timestamp = Date.now();
    const averageCandleSize = this.average(candles.map(candle => candle.totalHeight));
    const activeFVGList: FairValueGap[] = [];
    const filledFVGList: FairValueGap[] = [...(previousFvgData?.filledFVGList ?? [])];
    const invalidatedFVGList: FairValueGap[] = [...(previousFvgData?.invalidatedFVGList ?? [])];

    for (let i = 2; i < candles.length; i++) {
      const first = candles[i - 2];
      const middle = candles[i - 1];
      const third = candles[i];
      const bullishGap = third.high > first.low;
      const bearishGap = third.low < first.high;
      if (!bullishGap && !bearishGap) continue;

      const direction: 'bullish' | 'bearish' = bullishGap ? 'bullish' : 'bearish';
      const gapLow = bullishGap ? first.low : third.low;
      const gapHigh = bullishGap ? third.high : first.high;
      const top = Math.min(gapLow, gapHigh);
      const bottom = Math.max(gapLow, gapHigh);
      const gapSize = Math.abs(bottom - top);
      if (gapSize < Math.max(2, averageCandleSize * 0.12)) continue;

      const subsequent = candles.slice(i + 1);
      const deepestFill = subsequent.reduce((maxFill, candle) => {
        const overlapTop = Math.max(top, candle.high);
        const overlapBottom = Math.min(bottom, candle.low);
        return Math.max(maxFill, Math.max(0, overlapBottom - overlapTop));
      }, 0);
      const fillPercentage = this.clampScore((deepestFill / Math.max(gapSize, 1)) * 100);
      const invalidated = direction === 'bullish'
        ? subsequent.some(candle => candle.close > bottom)
        : subsequent.some(candle => candle.close < top);
      const status = invalidated ? 'invalidated' : (fillPercentage >= 90 ? 'completely_filled' : (fillPercentage > 15 ? 'partially_filled' : 'fresh'));
      const trendAligned = direction === 'bullish'
        ? this.isBullishTrend(trendData?.currentTrend?.direction)
        : this.isBearishTrend(trendData?.currentTrend?.direction);
      const structureAligned = marketStructureData?.currentStructure === direction;
      const eventAligned = (bosChochData?.latestBOS?.direction === direction || bosChochData?.latestCHOCH?.direction === direction);
      const obAligned = direction === 'bullish' ? !!orderBlockData?.nearestBullishOrderBlock : !!orderBlockData?.nearestBearishOrderBlock;
      const sweepAligned = liquidityData?.latestSweep?.direction === direction;
      const strength = this.clampScore((gapSize / Math.max(averageCandleSize, 1)) * 35 + (trendAligned ? 15 : 0) + (structureAligned ? 12 : 0) + (eventAligned ? 10 : 0) + (obAligned ? 8 : 0) + (sweepAligned ? 6 : 0) - fillPercentage * 0.25);
      const confidence = this.clampScore(this.average([first.confidence, middle.confidence, third.confidence]) + (gapSize / Math.max(averageCandleSize, 1)) * 10 + (trendAligned ? 8 : 0));
      const fvg: FairValueGap = {
        id: `FVG-${direction}-${this.candleIndex(first, i - 2)}-${this.candleIndex(third, i)}-${timestamp}`,
        type: direction,
        direction,
        startCandleIndex: this.candleIndex(first, i - 2),
        middleCandleIndex: this.candleIndex(middle, i - 1),
        endCandleIndex: this.candleIndex(third, i),
        gapHigh: bottom,
        gapLow: top,
        gapSize,
        fillPercentage,
        currentStatus: status,
        confidence,
        strength,
        timestamp,
        distanceFromCurrentPrice: Math.abs(((top + bottom) / 2) - currentPriceY),
        fillProbability: this.clampScore(85 - fillPercentage + this.distanceQuality(Math.abs(((top + bottom) / 2) - currentPriceY), averageCandleSize) * 0.2),
        mitigationProbability: this.clampScore(60 + fillPercentage * 0.3 + (trendAligned ? 8 : 0)),
        expectedReactionStrength: this.clampScore(strength * 0.7 + confidence * 0.3),
      };
      if (status === 'invalidated') invalidatedFVGList.push(fvg);
      else if (status === 'completely_filled') filledFVGList.push(fvg);
      else activeFVGList.push(fvg);
    }

    const nearestBullishFVG = activeFVGList.filter(fvg => fvg.direction === 'bullish').sort((a, b) => a.distanceFromCurrentPrice - b.distanceFromCurrentPrice)[0] ?? null;
    const nearestBearishFVG = activeFVGList.filter(fvg => fvg.direction === 'bearish').sort((a, b) => a.distanceFromCurrentPrice - b.distanceFromCurrentPrice)[0] ?? null;
    const fvgData: FvgData = {
      nearestBullishFVG,
      nearestBearishFVG,
      activeFVGList,
      filledFVGList,
      invalidatedFVGList,
      fvgSummary: `Detected ${activeFVGList.length} active FVGs, ${filledFVGList.length} filled, ${invalidatedFVGList.length} invalidated.`,
      overallConfidence: this.clampScore(this.average([...activeFVGList, ...filledFVGList].map(fvg => fvg.confidence))),
    };
    this.lastFvgData = fvgData;
    return fvgData;
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
