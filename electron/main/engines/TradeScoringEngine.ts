import { LoggerService } from '../LoggerService';
import { Candle, TrendData, MarketStructureData, BosChochData, LiquidityData, OrderBlockData, FvgData, PriceActionData, ConfluenceData, SupportResistanceData, TradeScoreData, TradeQualityClassification } from '../vision';

export class TradeScoringEngine {
  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  
  private clampScore(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private isBullishTrend(dir: string | undefined): boolean {
    return dir === 'strong_uptrend' || dir === 'weak_uptrend';
  }

  private isBearishTrend(dir: string | undefined): boolean {
    return dir === 'strong_downtrend' || dir === 'weak_downtrend';
  }

  private bodySize(candle: Candle): number {
    return Math.abs(candle.open - candle.close);
  }

  private distanceQuality(distance: number, avgCandleSize: number): number {
    if (avgCandleSize === 0) return 50;
    const ratio = distance / avgCandleSize;
    if (ratio < 1) return 100;
    if (ratio < 2) return 80;
    if (ratio < 5) return 50;
    return 20;
  }

  public analyzeTradeScore(
    candles: Candle[] | null,
    trendData: TrendData | null,
    marketStructureData: MarketStructureData | null,
    bosChochData: BosChochData | null,
    liquidityData: LiquidityData | null,
    orderBlockData: OrderBlockData | null,
    fvgData: FvgData | null,
    priceActionData: PriceActionData | null,
    confluenceData: ConfluenceData | null,
    supportResistanceData: SupportResistanceData | null,
    currentPriceY: number | null,
    previousTradeScoreData: TradeScoreData | null
  ): TradeScoreData | null {
    LoggerService.info('VisionManager: Starting Trade Scoring Engine.');
    if (!candles || candles.length === 0 || currentPriceY === null) {
      return previousTradeScoreData;
    }
    const timestamp = Date.now();
    const averageCandleSize = this.average(candles.map(candle => candle.totalHeight));
    const trendQuality = trendData?.currentTrend?.strength ?? 0;
    const marketStructureQuality = marketStructureData?.structureStrength ?? 0;
    const bosConfirmation = bosChochData?.latestBOS?.strength ?? 0;
    const chochConfirmation = bosChochData?.latestCHOCH?.strength ?? 0;
    const liquidityPosition = Math.max(liquidityData?.nearestBuySideLiquidity?.strength ?? 0, liquidityData?.nearestSellSideLiquidity?.strength ?? 0);
    const liquiditySweepQuality = liquidityData?.latestSweep?.sweepStrength ?? 0;
    const orderBlockQuality = Math.max(orderBlockData?.nearestBullishOrderBlock?.strength ?? 0, orderBlockData?.nearestBearishOrderBlock?.strength ?? 0);
    const fvgQuality = Math.max(fvgData?.nearestBullishFVG?.strength ?? 0, fvgData?.nearestBearishFVG?.strength ?? 0);
    const priceActionStrength = priceActionData?.latestPattern?.patternStrength ?? 0;
    const smcConfluence = confluenceData?.confluenceScore ?? 0;
    
    // Convert distance to quality
    const supportDistance = supportResistanceData?.nearestSupport ? this.distanceQuality(supportResistanceData.nearestSupport.distance, averageCandleSize) : 0;
    const resistanceDistance = supportResistanceData?.nearestResistance ? this.distanceQuality(supportResistanceData.nearestResistance.distance, averageCandleSize) : 0;
    
    const riskContext = confluenceData?.retailTrapProbability ?? 50;
    const momentum = trendData?.currentTrend?.momentumScore ?? 0;
    const volatility = this.clampScore(averageCandleSize / Math.max(this.average(candles.slice(-10).map(candle => this.bodySize(candle))), 1) * 35);
    
    // Calculate RSI and Stochastic (FTT specific momentum indicators)
    let rsi = 50;
    let stoch = 50;
    if (candles.length >= 14) {
      const last14 = candles.slice(-14);
      let avgGain = 0, avgLoss = 0;
      last14.forEach(c => {
        if (c.direction === 'bullish') avgGain += Math.abs(c.close - c.open);
        else if (c.direction === 'bearish') avgLoss += Math.abs(c.close - c.open);
      });
      avgGain /= 14; avgLoss /= 14;
      rsi = avgLoss === 0 ? 100 : (avgGain === 0 ? 0 : 100 - (100 / (1 + (avgGain / avgLoss))));
      
      const highestHigh = Math.min(...last14.map(c => c.high)); 
      const lowestLow = Math.max(...last14.map(c => c.low));    
      const currentClose = candles[candles.length - 1].close;
      stoch = lowestLow === highestHigh ? 50 : 100 * ((lowestLow - currentClose) / (lowestLow - highestHigh));
    }
    
    const rsiBullish = rsi < 30 ? 90 : (rsi > 70 ? 10 : (rsi > 50 ? 60 : 40));
    const rsiBearish = rsi > 70 ? 90 : (rsi < 30 ? 10 : (rsi < 50 ? 60 : 40));
    const stochBullish = stoch < 20 ? 90 : (stoch > 80 ? 10 : (stoch > 50 ? 60 : 40));
    const stochBearish = stoch > 80 ? 90 : (stoch < 20 ? 10 : (stoch < 50 ? 60 : 40));

    const scoringFactors = {
      trendQuality, marketStructureQuality, bosConfirmation, chochConfirmation,
      liquidityPosition, liquiditySweepQuality, orderBlockQuality, fvgQuality,
      priceActionStrength, smcConfluence, supportDistance, resistanceDistance,
      riskContext, momentum, volatility, rsi, stoch
    } as any; // Type override since we added rsi/stoch which aren't in the interface

    const bullishDirectional = [
      this.isBullishTrend(trendData?.currentTrend?.direction) ? trendQuality : 0,
      marketStructureData?.currentStructure === 'bullish' ? marketStructureQuality : 0,
      bosChochData?.latestBOS?.direction === 'bullish' ? bosConfirmation : 0,
      bosChochData?.latestCHOCH?.direction === 'bullish' ? chochConfirmation : 0,
      liquidityData?.latestSweep?.direction === 'bullish' ? liquiditySweepQuality : 0,
      orderBlockData?.nearestBullishOrderBlock?.strength ?? 0,
      fvgData?.nearestBullishFVG?.strength ?? 0,
      priceActionData?.latestPattern?.direction === 'bullish' ? priceActionStrength : 0,
      confluenceData?.bullishScore ?? 0,
      supportDistance, rsiBullish, stochBullish
    ];

    const bearishDirectional = [
      this.isBearishTrend(trendData?.currentTrend?.direction) ? trendQuality : 0,
      marketStructureData?.currentStructure === 'bearish' ? marketStructureQuality : 0,
      bosChochData?.latestBOS?.direction === 'bearish' ? bosConfirmation : 0,
      bosChochData?.latestCHOCH?.direction === 'bearish' ? chochConfirmation : 0,
      liquidityData?.latestSweep?.direction === 'bearish' ? liquiditySweepQuality : 0,
      orderBlockData?.nearestBearishOrderBlock?.strength ?? 0,
      fvgData?.nearestBearishFVG?.strength ?? 0,
      priceActionData?.latestPattern?.direction === 'bearish' ? priceActionStrength : 0,
      confluenceData?.bearishScore ?? 0,
      resistanceDistance, rsiBearish, stochBearish
    ];

    const bullishScore = this.clampScore(this.average(bullishDirectional) * 0.70 + smcConfluence * 0.30);
    const bearishScore = this.clampScore(this.average(bearishDirectional) * 0.70 + smcConfluence * 0.30);
    const neutralScore = this.clampScore((100 - Math.abs(bullishScore - bearishScore)) * 0.55 + (confluenceData?.neutralScore ?? 0) * 0.45);
    const totalDirectional = Math.max(1, bullishScore + bearishScore + neutralScore);
    const bullishPercentage = this.clampScore((bullishScore / totalDirectional) * 100);
    const bearishPercentage = this.clampScore((bearishScore / totalDirectional) * 100);
    const neutralPercentage = this.clampScore((neutralScore / totalDirectional) * 100);
    
    const retailTrapRisk = confluenceData?.retailTrapProbability ?? 0;
    const fakeBreakoutRisk = this.clampScore((bosChochData?.latestCHOCH ? 25 : 0) + (liquidityData?.latestSweep && !bosChochData?.latestBOS ? 25 : 0) + (Math.abs(bullishScore - bearishScore) < 12 ? 25 : 0));
    
    const riskScore = this.clampScore(retailTrapRisk * 0.45 + fakeBreakoutRisk * 0.35 + Math.max(0, volatility - 65) * 0.2);
    const grossScore = Math.max(bullishScore, bearishScore, neutralScore);
    const overallScore = this.clampScore(grossScore * 0.62 + smcConfluence * 0.28 + priceActionStrength * 0.1 - riskScore * 0.25);
    const trendContinuationScore = this.clampScore((bosConfirmation * 0.3) + (trendQuality * 0.35) + (confluenceData?.continuationProbability ?? 0) * 0.35);
    const trendReversalScore = this.clampScore((chochConfirmation * 0.35) + (liquiditySweepQuality * 0.25) + (confluenceData?.reversalProbability ?? 0) * 0.4);
    
    const confidence = this.clampScore(this.average([
      trendData?.currentTrend?.confidence ?? 0,
      marketStructureData?.structureConfidence ?? 0,
      bosChochData?.overallConfidence ?? 0,
      liquidityData?.overallConfidence ?? 0,
      orderBlockData?.overallConfidence ?? 0,
      fvgData?.overallConfidence ?? 0,
      priceActionData?.overallConfidence ?? 0,
      confluenceData?.confidence ?? 0,
    ]));

    const tradeQuality: TradeQualityClassification = overallScore >= 82 && riskScore <= 35
      ? 'High Probability Institutional Setup'
      : (overallScore >= 68 ? 'Strong' : (overallScore >= 50 ? 'Average' : (overallScore >= 30 ? 'Weak' : 'Very Weak')));

    const tradeScoreData: TradeScoreData = {
      id: `tradeScore-${timestamp}`,
      overallScore,
      bullishScore, bearishScore, neutralScore, confidence, riskScore, timestamp,
      tradeQuality,
      reasonSummary: `Score ${overallScore}/100, quality ${tradeQuality}, risk ${riskScore}/100.`,
      recommendedExpiry: overallScore > 65 ? '1-3 minutes' : null,
      riskRewardRatio: overallScore > 65 ? 1.5 : null,
      expectedWinRate: overallScore > 65 ? Math.min(85, overallScore + 5) : null,
      scoringFactors,
      bullishPercentage, bearishPercentage, neutralPercentage,
      retailTrapRisk, fakeBreakoutRisk, trendContinuationScore, trendReversalScore
    };
    return tradeScoreData;
  }
}
