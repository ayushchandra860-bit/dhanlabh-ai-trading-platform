import { Candle } from '../../../vision';
import { LoggerService } from '../../../LoggerService';
import { DataIntegrityPipeline } from '../safety/DataIntegrityPipeline';

export interface ExtractedFeatures {
  volatility: number;
  momentum: number;
  spread: number;
  standardDeviation: number;
}

export class FeatureExtractionEngine {
  private integrityPipeline: DataIntegrityPipeline;

  constructor() {
    this.integrityPipeline = new DataIntegrityPipeline();
  }

  public extract(candles: Candle[]): ExtractedFeatures {
    if (!candles || candles.length === 0) {
      return { volatility: 0, momentum: 0, spread: 0, standardDeviation: 0 };
    }

    try {
      const volatility = this.calculateVolatility(candles);
      const momentum = this.calculateMomentum(candles);
      const spread = this.calculateSpread(candles);
      const standardDeviation = this.calculateStdDev(candles);

      // Validate outputs before passing them on
      return {
        volatility: this.integrityPipeline.validateNumberStrict(volatility, 'Volatility'),
        momentum: this.integrityPipeline.validateNumberStrict(momentum, 'Momentum'),
        spread: this.integrityPipeline.validateNumberStrict(spread, 'Spread'),
        standardDeviation: this.integrityPipeline.validateNumberStrict(standardDeviation, 'StandardDeviation'),
      };
    } catch (err) {
      LoggerService.error(`[MARS Math] Feature Extraction Failed: ${err}`);
      return { volatility: 0, momentum: 0, spread: 0, standardDeviation: 0 };
    }
  }

  private calculateVolatility(candles: Candle[]): number {
    // Average candle totalHeight over the window
    const sum = candles.reduce((acc, c) => acc + c.totalHeight, 0);
    return sum / candles.length;
  }

  private calculateMomentum(candles: Candle[]): number {
    // Sum of body vectors (bullish = +, bearish = -)
    const momentum = candles.reduce((acc, c) => {
      const vec = c.direction === 'bullish' ? c.bodySize : (c.direction === 'bearish' ? -c.bodySize : 0);
      return acc + vec;
    }, 0);
    return momentum;
  }

  private calculateSpread(candles: Candle[]): number {
    // Average upper/lower wick sizes compared to body
    const totalWickSize = candles.reduce((acc, c) => acc + c.upperWickLength + c.lowerWickLength, 0);
    return totalWickSize / candles.length;
  }

  private calculateStdDev(candles: Candle[]): number {
    if (candles.length < 2) return 0;
    
    // Mean of body sizes
    const mean = candles.reduce((acc, c) => acc + c.bodySize, 0) / candles.length;
    
    // Variance
    const variance = candles.reduce((acc, c) => {
      const diff = c.bodySize - mean;
      return acc + (diff * diff);
    }, 0) / candles.length;

    return Math.sqrt(variance);
  }
}
