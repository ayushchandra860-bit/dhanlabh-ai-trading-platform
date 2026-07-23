import { LoggerService } from '../LoggerService';
import { Candle, MomentumData, MomentumState, TrendData } from '../vision';

export class MomentumEngine {
  public analyze(candles: Candle[], trendData: TrendData | null): MomentumData | null {
    if (!candles || candles.length < 5) return null;

    let acceleration = 0;
    let deceleration = 0;
    let exhaustionProbability = 0;
    let strength = 0;
    let state: MomentumState = 'Neutral';

    // Calculate Rate of Change (ROC) over the last 5 candles
    const currentPrice = candles[candles.length - 1].close;
    const pastPrice = candles[candles.length - 5].close;
    const roc = ((currentPrice - pastPrice) / pastPrice) * 100;

    // Calculate average body size for momentum strength
    let bodySum = 0;
    let recentBodySum = 0;
    for (let i = 0; i < candles.length; i++) {
      const body = Math.abs(candles[i].close - candles[i].open);
      bodySum += body;
      if (i >= candles.length - 3) recentBodySum += body;
    }
    
    const avgBody = bodySum / candles.length;
    const recentAvgBody = recentBodySum / 3;

    // Strength based on body expansion
    strength = Math.min(100, (recentAvgBody / avgBody) * 50);

    // Acceleration & Deceleration based on successive body sizes and ROC
    const c1 = candles[candles.length - 1];
    const c2 = candles[candles.length - 2];
    const c3 = candles[candles.length - 3];

    const body1 = Math.abs(c1.close - c1.open);
    const body2 = Math.abs(c2.close - c2.open);
    const body3 = Math.abs(c3.close - c3.open);

    if (body1 > body2 && body2 > body3) {
      acceleration = Math.min(100, strength * 1.2);
      state = 'Acceleration';
    } else if (body1 < body2 && body2 < body3) {
      deceleration = Math.min(100, (avgBody / Math.max(1, body1)) * 30);
      state = 'Deceleration';
      strength = Math.max(0, strength - 20);
    }

    // Exhaustion detection: Huge volume/body followed by tiny body or pin bar
    if (c2.totalHeight > avgBody * 2 && body1 < avgBody * 0.5) {
      exhaustionProbability = 85;
      state = 'Exhaustion';
    }

    if (Math.abs(roc) > 0.5 && state === 'Neutral') {
       state = 'Acceleration';
       acceleration = Math.min(100, Math.abs(roc) * 100);
    }

    const direction = roc > 0 ? 'Bullish' : (roc < 0 ? 'Bearish' : 'Neutral');
    const score = strength;
    const confidence = 80;
    const explanation = `Momentum is ${state} (${direction}) with strength ${Math.round(strength)}.`;
    return {
      state,
      direction,
      strength,
      score,
      confidence,
      explanation,
      acceleration,
      deceleration,
      exhaustionProbability
    };
  }
}
