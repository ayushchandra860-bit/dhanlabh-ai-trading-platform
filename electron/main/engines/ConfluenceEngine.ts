import { LoggerService } from '../LoggerService';
import { 
  ConfluenceData, ConfluenceFactor, InstitutionalBias, 
  TrendData, MarketStructureData, BosChochData, 
  LiquidityData, OrderBlockData, FvgData, 
  PriceActionData, CandleStrengthData, LiveMarketObservation, IndicatorData
} from '../vision';

export class ConfluenceEngine {
  // Bayesian Prior: 50% chance of success without evidence
  private readonly PRIOR_ODDS = 1.0; 
  
  private clampScore(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private oddsToProbability(odds: number): number {
    return odds / (1 + odds);
  }

  /**
   * Calculates Likelihood Ratio.
   * If confidence is 0, LR = 1 (neutral, no effect).
   * If confidence is 100, LR = baseLR.
   */
  private calculateEffectiveLR(baseLR: number, confidence: number): number {
    if (confidence <= 0) return 1.0;
    const scaledConfidence = confidence / 100;
    // Log-linear interpolation for LR
    const logBase = Math.log(baseLR);
    return Math.exp(logBase * scaledConfidence);
  }

  public analyzeConfluence(
    trendData: TrendData | null,
    marketStructureData: MarketStructureData | null,
    bosChochData: BosChochData | null,
    liquidityData: LiquidityData | null,
    orderBlockData: OrderBlockData | null,
    fvgData: FvgData | null,
    priceActionData: PriceActionData | null,
    candleStrengthData: CandleStrengthData[] | null,
    liveObs: LiveMarketObservation | null,
    indicatorData: IndicatorData | null,
    previousConfluenceData: ConfluenceData | null
  ): ConfluenceData | null {
    LoggerService.info('VisionManager: Starting Bayesian Evidence Fusion Engine (Confluence).');
    const timestamp = Date.now();
    const factors: ConfluenceFactor[] = [];
    
    let currentOdds = this.PRIOR_ODDS;

    const addEvidence = (module: string, factor: string, direction: 'bullish' | 'bearish' | 'neutral', baseLR: number, confidence: number) => {
      const effectiveLR = this.calculateEffectiveLR(baseLR, confidence);
      currentOdds *= effectiveLR;
      
      let scoreContrib = 0;
      if (effectiveLR > 1) {
        scoreContrib = (effectiveLR - 1) * 10; 
      } else if (effectiveLR < 1) {
        scoreContrib = (1 - effectiveLR) * 10;
      }

      factors.push({ module, factor, direction, scoreContribution: this.clampScore(scoreContrib), confidence: this.clampScore(confidence) });
    };

    // 1. Trend Evidence (Strong trend provides high LR for continuation)
    if (trendData?.currentTrend) {
      const t = trendData.currentTrend;
      if (t.direction.includes('uptrend')) {
        addEvidence('Trend', t.direction, 'bullish', 1.8, t.confidence);
      } else if (t.direction.includes('downtrend')) {
        addEvidence('Trend', t.direction, 'bearish', 1.8, t.confidence);
      }
    }

    // 2. Market Structure Evidence
    if (marketStructureData?.currentStructure) {
      if (marketStructureData.currentStructure === 'bullish') {
        addEvidence('Structure', 'bullish', 'bullish', 1.6, marketStructureData.structureConfidence);
      } else if (marketStructureData.currentStructure === 'bearish') {
        addEvidence('Structure', 'bearish', 'bearish', 1.6, marketStructureData.structureConfidence);
      }
    }

    // 3. BOS / CHOCH (Confirmation of structure break)
    if (bosChochData?.latestBOS) {
      addEvidence('PriceAction', 'BOS', bosChochData.latestBOS.direction, 2.0, bosChochData.latestBOS.confidence);
    }
    if (bosChochData?.latestCHOCH) {
      addEvidence('PriceAction', 'CHOCH', bosChochData.latestCHOCH.direction, 2.5, bosChochData.latestCHOCH.confidence);
    }

    // 4. Liquidity Sweeps (Reversal Evidence)
    if (liquidityData?.latestSweep) {
      addEvidence('Liquidity', 'Sweep', liquidityData.latestSweep.direction, 2.2, liquidityData.latestSweep.confidence);
    }

    // 5. Order Blocks & FVGs
    if (orderBlockData?.nearestBullishOrderBlock) {
      addEvidence('Zones', 'Bullish OB', 'bullish', 1.4, orderBlockData.nearestBullishOrderBlock.confidence);
    }
    if (orderBlockData?.nearestBearishOrderBlock) {
      addEvidence('Zones', 'Bearish OB', 'bearish', 1.4, orderBlockData.nearestBearishOrderBlock.confidence);
    }

    // 6. Price Action Patterns
    if (priceActionData?.latestPattern) {
      addEvidence('Pattern', priceActionData.latestPattern.patternName, priceActionData.latestPattern.direction, 1.5, priceActionData.latestPattern.confidence);
    }

    // Calculate final probabilities based on aggregated odds
    // In a real Bayesian net, we'd have Odds(Bullish) and Odds(Bearish).
    // Here we map the single Odds(Success) to a bullish/bearish score based on dominant evidence.
    let bullishScore = 0;
    let bearishScore = 0;
    
    factors.forEach(f => {
       if(f.direction === 'bullish') bullishScore += f.scoreContribution;
       if(f.direction === 'bearish') bearishScore += f.scoreContribution;
    });

    const totalScore = bullishScore + bearishScore || 1;
    const probability = this.oddsToProbability(currentOdds); // 0 to 1
    
    // Normalize back to 0-100 scale for ConfluenceScore
    const confluenceScore = this.clampScore(probability * 100);

    let institutionalBias: InstitutionalBias = 'neutral';
    if (bullishScore > bearishScore * 1.5 && confluenceScore > 60) institutionalBias = 'bullish';
    else if (bearishScore > bullishScore * 1.5 && confluenceScore > 60) institutionalBias = 'bearish';

    return {
      id: `conf-${timestamp}`,
      institutionalBias,
      bullishScore: this.clampScore((bullishScore / totalScore) * 100),
      bearishScore: this.clampScore((bearishScore / totalScore) * 100),
      neutralScore: this.clampScore(100 - confluenceScore),
      confluenceScore,
      confidence: this.clampScore((factors.reduce((a,b)=>a+b.confidence, 0) / Math.max(1, factors.length))),
      reasonSummary: `Bayesian Probability: ${(probability*100).toFixed(1)}%. Evidence mapped.`,
      supportingFactors: factors.filter(f => f.direction === institutionalBias),
      rejectingFactors: factors.filter(f => f.direction !== institutionalBias && f.direction !== 'neutral'),
      timestamp,
      retailTrapProbability: 50, // To be handled by conflict detection
      reversalProbability: 50,
      continuationProbability: 50
    };
  }
}
