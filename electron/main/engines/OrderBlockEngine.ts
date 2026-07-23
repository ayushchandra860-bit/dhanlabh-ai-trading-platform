import { LoggerService } from '../LoggerService';
import { config } from '../config';
import { 
  Candle, MarketState, SupportResistanceData, TrendData, 
  MarketStructureData, BosChochData, LiquidityData, OrderBlockData, OrderBlock, 
  FvgData, PriceActionData, ConfluenceData, TradeScoreData, 
  AIDecisionData, AIReasoning, TrendDirection, ReasonCategory, ReasonPriority, AIReason, AIDecisionType
} from '../vision';
import { OcrResult } from '../ocr';


export class OrderBlockEngine {
  public lastOrderBlockData: any = null;

  public analyzeOrderBlocks(
    candles: Candle[] | null,
    trendData: TrendData | null,
    marketStructureData: MarketStructureData | null,
    bosChochData: BosChochData | null,
    liquidityData: LiquidityData | null,
    currentPriceY: number | null,
    previousOrderBlockData: OrderBlockData | null
  ): OrderBlockData | null {
    LoggerService.info('VisionManager: Starting Order Block Detection Engine.');
    if (!candles || candles.length < 3 || currentPriceY === null) {
      return previousOrderBlockData;
    }
    const timestamp = Date.now();
    const averageCandleSize = this.average(candles.map(candle => candle.totalHeight));
    const activeOrderBlocks: OrderBlock[] = [];
    const mitigatedOrderBlocks: OrderBlock[] = [...(previousOrderBlockData?.mitigatedOrderBlocks ?? [])];
    const invalidatedOrderBlocks: OrderBlock[] = [...(previousOrderBlockData?.invalidatedOrderBlocks ?? [])];
    const latestEvents = [...(bosChochData?.bosHistory ?? []), ...(bosChochData?.chochHistory ?? [])];

    for (let i = 1; i < candles.length - 1; i++) {
      const origin = candles[i - 1];
      const displacement = candles[i];
      const followThrough = candles[i + 1];
      const displacementSize = this.bodySize(displacement);
      const hasBullishDisplacement = origin.direction === 'bearish' && displacement.direction === 'bullish' && displacementSize >= averageCandleSize * 0.9 && followThrough.close <= displacement.close;
      const hasBearishDisplacement = origin.direction === 'bullish' && displacement.direction === 'bearish' && displacementSize >= averageCandleSize * 0.9 && followThrough.close >= displacement.close;
      if (!hasBullishDisplacement && !hasBearishDisplacement) continue;

      const blockType: 'bullish' | 'bearish' = hasBullishDisplacement ? 'bullish' : 'bearish';
      const originIndex = this.candleIndex(origin, i - 1);
      const confirmationIndex = this.candleIndex(displacement, i);
      const zoneTop = Math.min(origin.open, origin.close, origin.high);
      const zoneBottom = Math.max(origin.open, origin.close, origin.low);
      const touches = candles.slice(i + 1).filter(candle => candle.low >= zoneTop && candle.high <= zoneBottom).length;
      const invalidated = blockType === 'bullish'
        ? candles.slice(i + 1).some(candle => candle.close > zoneBottom)
        : candles.slice(i + 1).some(candle => candle.close < zoneTop);
      const mitigated = touches > 0 && !invalidated;
      const contextEvent = latestEvents.find(event => Math.abs(event.breakingCandleIndex - confirmationIndex) <= 2 && event.direction === blockType);
      const sweepContext = liquidityData?.latestSweep?.direction === blockType && Math.abs(liquidityData.latestSweep.endCandleIndex - confirmationIndex) <= 3;
      const trendAligned = blockType === 'bullish'
        ? this.isBullishTrend(trendData?.currentTrend?.direction)
        : this.isBearishTrend(trendData?.currentTrend?.direction);
      const structureAligned = marketStructureData?.currentStructure === blockType;
      const strength = this.clampScore(
        (displacementSize / Math.max(averageCandleSize, 1)) * 28 +
        (contextEvent?.strength ?? 0) * 0.25 +
        (trendAligned ? 15 : 0) +
        (structureAligned ? 12 : 0) +
        (sweepContext ? 10 : 0) -
        touches * 5
      );
      const confidence = this.clampScore(this.average([origin.confidence, displacement.confidence, contextEvent?.confidence ?? 55]) + (trendAligned ? 8 : 0) + (structureAligned ? 6 : 0));
      const block: OrderBlock = {
        blockType,
        direction: blockType,
        originCandleIndex: originIndex,
        startPrice: zoneTop,
        endPrice: zoneBottom,
        high: zoneTop,
        low: zoneBottom,
        midPrice: (zoneTop + zoneBottom) / 2,
        confirmationCandleIndex: confirmationIndex,
        strength,
        confidence,
        touchCount: touches,
        mitigationCount: mitigated ? touches : 0,
        currentStatus: invalidated ? 'invalidated' : (mitigated ? 'mitigated' : (touches > 0 ? 'tested' : 'fresh')),
        timestamp,
        distanceFromCurrentPrice: Math.abs(((zoneTop + zoneBottom) / 2) - currentPriceY),
        mitigationProbability: this.clampScore(80 - Math.abs(((zoneTop + zoneBottom) / 2) - currentPriceY) / Math.max(averageCandleSize, 1) * 15 + touches * 8),
        retestProbability: this.clampScore(70 - touches * 12 + (trendAligned ? 10 : 0)),
      };

      if (block.currentStatus === 'invalidated') invalidatedOrderBlocks.push(block);
      else if (block.currentStatus === 'mitigated') mitigatedOrderBlocks.push(block);
      else activeOrderBlocks.push(block);
    }

    const nearestBullishOrderBlock = activeOrderBlocks
      .filter(block => block.blockType === 'bullish')
      .sort((a, b) => a.distanceFromCurrentPrice - b.distanceFromCurrentPrice)[0] ?? null;
    const nearestBearishOrderBlock = activeOrderBlocks
      .filter(block => block.blockType === 'bearish')
      .sort((a, b) => a.distanceFromCurrentPrice - b.distanceFromCurrentPrice)[0] ?? null;
    const overallConfidence = this.clampScore(this.average([...activeOrderBlocks, ...mitigatedOrderBlocks].map(block => block.confidence)));
    const orderBlockData: OrderBlockData = {
      nearestBullishOrderBlock: null,
      nearestBearishOrderBlock: null,
      activeOrderBlocks,
      mitigatedOrderBlocks,
      invalidatedOrderBlocks,
      orderBlockSummary: `Detected ${activeOrderBlocks.length} active order blocks, ${mitigatedOrderBlocks.length} mitigated, ${invalidatedOrderBlocks.length} invalidated.`,
      overallConfidence,
    };
    orderBlockData.nearestBullishOrderBlock = nearestBullishOrderBlock;
    orderBlockData.nearestBearishOrderBlock = nearestBearishOrderBlock;
    this.lastOrderBlockData = orderBlockData;
    return orderBlockData;
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
