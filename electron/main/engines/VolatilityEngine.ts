import { LoggerService } from '../LoggerService';
import { Candle, VolatilityData } from '../vision';

export class VolatilityEngine {
  public analyze(candles: Candle[]): VolatilityData | null {
    if (!candles || candles.length < 5) return null;

    // Calculate ATR (Average True Range)
    let trSum = 0;
    let trSumRecent = 0;
    
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      
      const tr1 = current.high - current.low;
      const tr2 = Math.abs(current.high - previous.close);
      const tr3 = Math.abs(current.low - previous.close);
      
      const tr = Math.max(tr1, tr2, tr3);
      trSum += tr;
      
      if (i >= candles.length - 5) {
        trSumRecent += tr;
      }
    }

    const atr = trSum / (candles.length - 1);
    const recentAtr = trSumRecent / 5;
    
    // Volatility Index based on ratio of recent ATR to overall ATR
    const volatilityRatio = atr > 0 ? (recentAtr / atr) : 1;
    const volatilityIndex = Math.min(100, volatilityRatio * 50);
    
    // Calculate Noise (wicks vs bodies)
    let wickSum = 0;
    let bodySum = 0;
    for (let i = 0; i < candles.length; i++) {
       const body = Math.abs(candles[i].close - candles[i].open);
       const total = candles[i].totalHeight;
       wickSum += (total - body);
       bodySum += body;
    }
    const noiseLevel = bodySum > 0 ? Math.min(100, (wickSum / bodySum) * 40) : 50;
    
    const expectedMove = atr * 1.5;

    const currentVolatility = atr;
    const averageVolatility = atr; // simplified for now
    const state = volatilityIndex > 70 ? 'High' : (volatilityIndex > 30 ? 'Medium' : 'Low');
    const confidence = 85;
    const explanation = `Volatility is ${state} (Index: ${Math.round(volatilityIndex)}). Expected move is ${expectedMove.toFixed(1)}px.`;
    return {
      atr,
      currentVolatility,
      averageVolatility,
      state,
      confidence,
      explanation,
      volatilityIndex,
      noiseLevel,
      expectedMove
    };
  }
}
