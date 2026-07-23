import { LoggerService } from '../LoggerService';
import { RiskData, TrendData, VolatilityData, MarketStructureData, SupportResistanceData, Candle, MomentumData, LiquidityData } from '../vision';

export class RiskEngine {
  public analyze(
    candles: Candle[], 
    trendData: TrendData | null, 
    momentumData: MomentumData | null,
    volatilityData: VolatilityData | null,
    liquidityData: LiquidityData | null,
    structureData: MarketStructureData | null,
    srData: SupportResistanceData | null
  ): RiskData | null {
    if (!candles || candles.length < 5) return null;

    let lateEntryRisk = 0;
    let breakoutRisk = 0;
    let fakeoutRisk = 0;
    let volatilityRisk = 0;

    // Volatility Risk
    if (volatilityData) {
      volatilityRisk = Math.min(100, volatilityData.volatilityIndex * (volatilityData.noiseLevel > 60 ? 1.5 : 1));
    }

    // Late Entry Risk
    if (trendData?.currentTrend && momentumData) {
      if (trendData.currentTrend.direction.includes('strong') && momentumData.state === 'Deceleration') {
        lateEntryRisk = 80;
      } else if (momentumData.state === 'Exhaustion') {
        lateEntryRisk = 95;
      }
    }

    // Fakeout Risk based on Liquidity and Structure
    if (liquidityData?.nearestBuySideLiquidity || liquidityData?.nearestSellSideLiquidity) {
       // if we are near liquidity pools but no sweep happened yet
       if (!liquidityData.latestSweep) {
         fakeoutRisk += 50;
       }
    }
    
    // Breakout Risk based on Support/Resistance
    if (srData) {
      const nearSupport = srData.nearestSupport && (typeof srData.nearestSupport.distance === 'number') && srData.nearestSupport.distance < (volatilityData?.atr ?? 10);
      const nearResistance = srData.nearestResistance && (typeof srData.nearestResistance.distance === 'number') && srData.nearestResistance.distance < (volatilityData?.atr ?? 10);
      
      if (nearSupport || nearResistance) {
        breakoutRisk = 75;
        // high probability of fakeout if momentum is dropping near SR
        if (momentumData?.state === 'Deceleration') {
           fakeoutRisk = Math.min(100, fakeoutRisk + 40);
        }
      }
    }

    const riskLevel = Math.min(100, Math.round((lateEntryRisk * 0.3) + (breakoutRisk * 0.2) + (fakeoutRisk * 0.3) + (volatilityRisk * 0.2)));

    const confidence = 90;
    const explanation = `Risk is ${riskLevel}/100. Fakeout: ${fakeoutRisk}, Breakout: ${breakoutRisk}, Late Entry: ${lateEntryRisk}.`;
    return {
      riskLevel,
      fakeoutRisk,
      breakoutRisk,
      lateEntryRisk,
      volatilityRisk,
      confidence,
      explanation
    };
  }
}
