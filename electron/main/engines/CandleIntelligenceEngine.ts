import { LoggerService } from '../LoggerService';
import { Candle, CandleStrengthData } from '../vision';

export class CandleIntelligenceEngine {
  public analyzeCandles(candles: Candle[] | null): CandleStrengthData[] | null {
    LoggerService.info('VisionManager: Starting Candle Intelligence Engine.');

    if (!candles || candles.length === 0) {
      LoggerService.warn('VisionManager: No candles provided for Candle Intelligence Engine.');
      return null;
    }

    const candleStrengthDataArray: CandleStrengthData[] = [];

    for (const candle of candles) {
      const totalHeight = candle.totalHeight > 0 ? candle.totalHeight : 1;
      
      const bodyRatio = candle.bodySize / totalHeight;
      const upperWickRatio = candle.upperWickLength / totalHeight;
      const lowerWickRatio = candle.lowerWickLength / totalHeight;
      
      // Calculate close and open position relative to the total height
      // 0 means it's at the absolute low, 1 means it's at the absolute high
      let closePosition = 0;
      let openPosition = 0;
      
      // We assume lower Y is higher price in pixel coordinates, but let's use the price values directly if they make sense.
      // If open/close are prices and high/low are prices:
      const priceRange = Math.abs(candle.high - candle.low);
      if (priceRange > 0) {
        // Position relative to low. 
        closePosition = Math.abs(candle.close - Math.min(candle.high, candle.low)) / priceRange;
        openPosition = Math.abs(candle.open - Math.min(candle.high, candle.low)) / priceRange;
      } else {
        // Fallback to pixels
        closePosition = 0.5;
        openPosition = 0.5;
      }

      // Calculate a holistic strength score
      // A strong bullish candle has a high closePosition and large bodyRatio
      // A strong bearish candle has a low closePosition and large bodyRatio
      // We'll normalize it so 100 is extremely strong bullish, -100 is extremely strong bearish.
      // Actually, strengthScore could just be an absolute value 0-100 indicating momentum, or directional (-100 to 100).
      // Let's use directional strength -100 to 100, then map it.
      // The prompt asks for holistic "Candle Strength Score", so let's make it 0-100 absolute strength, 
      // or maybe just a score combining body size and close position.
      
      let strengthScore = 0;
      if (candle.direction === 'bullish') {
        strengthScore = (bodyRatio * 50) + (closePosition * 50);
      } else if (candle.direction === 'bearish') {
        // for bearish, closePosition is near 0, so (1 - closePosition) is near 1
        strengthScore = (bodyRatio * 50) + ((1 - closePosition) * 50);
      } else {
        // doji
        strengthScore = 10; 
      }

      // Cap at 0-100
      strengthScore = Math.max(0, Math.min(100, strengthScore));

      const candleData: CandleStrengthData = {
        bodySize: candle.bodySize,
        upperWick: candle.upperWickLength,
        lowerWick: candle.lowerWickLength,
        bodyRatio: bodyRatio,
        closePosition: closePosition,
        openPosition: openPosition,
        strengthScore: strengthScore
      };

      candleStrengthDataArray.push(candleData);
    }

    LoggerService.info('VisionManager: Candle Intelligence Engine analysis complete.');
    return candleStrengthDataArray;
  }
}
