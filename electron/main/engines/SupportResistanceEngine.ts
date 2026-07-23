// @ts-nocheck
import { LoggerService } from '../LoggerService';
import { config } from '../config';
import { 
  Candle, MarketState, SupportResistanceData, TrendData, 
  MarketStructureData, BosChochData, LiquidityData, OrderBlockData, 
  FvgData, PriceActionData, ConfluenceData, TradeScoreData, 
  AIDecisionData, AIReasoning, TrendDirection, ReasonCategory, ReasonPriority, AIReason, AIDecisionType, SupportResistanceLevel
} from '../vision';
import { OcrResult } from '../ocr';
import { PriceScaleCalibrationService } from './PriceScaleCalibrationService';


export class SupportResistanceEngine {

  public analyzeSupportResistance(
    marketState: MarketState | null,
    candles: Candle[] | null,
    calibration: PriceScaleCalibrationService
  ): SupportResistanceData | null {
    LoggerService.info('VisionManager: Starting Support & Resistance analysis.');

    const srData: SupportResistanceData = {
      nearestSupport: null,
      nearestResistance: null,
      supportList: [],
      resistanceList: [],
    };

    // Ensure we have enough candles and current price for analysis
    if (!candles || candles.length < config.vision.minCandlesForStructureAnalysis || !marketState || marketState.currentPrice === null) {
      LoggerService.warn('VisionManager: Insufficient candles or market state (current price) for S&R analysis. Returning null.');
      return null;
    }

    const currentPriceY = marketState.currentPrice; // This is a pixel Y-coordinate
    const analysisTimestamp = Date.now(); // Timestamp for the detected levels

    // Configuration for S&R detection (can be moved to config.ts later)
    const SWING_LOOKBACK = 3; // Number of candles to look left/right to define a swing point
    const MERGE_THRESHOLD_PX = 5; // Pixel distance to merge nearby levels
    const TOUCH_TOLERANCE_PX = 2; // Pixel tolerance for price touching a level
    const MIN_TOUCH_COUNT = 2; // Minimum touches for a level to be considered valid
    const MIN_STRENGTH = 30; // Minimum strength for a level to be included
    const MIN_CONFIDENCE = 50; // Minimum confidence for a level

    const potentialLevels: SupportResistanceLevel[] = [];

    // 1. Detect Swing Highs and Swing Lows
    // Iterate through candles, excluding the first and last few for swing point calculation
    for (let i = SWING_LOOKBACK; i < candles.length - SWING_LOOKBACK; i++) {
      const currentCandle = candles[i];
      // Ensure candleIndex is defined, as it's used for ID and range
      if (currentCandle.candleIndex === undefined) {
        LoggerService.warn(`VisionManager: Candle at index ${i} has undefined candleIndex. Skipping.`);
        continue;
      }

      const leftCandles = candles.slice(i - SWING_LOOKBACK, i);
      const rightCandles = candles.slice(i + 1, i + SWING_LOOKBACK + 1);

      // Check for Swing High (Resistance)
      const isSwingHigh = leftCandles.every(c => currentCandle.high <= c.high) &&
                          rightCandles.every(c => currentCandle.high <= c.high);
      if (isSwingHigh) {
        const levelPrice = calibration.getPriceForY(currentCandle.high) || currentCandle.high;
        potentialLevels.push({
          id: `R-${currentCandle.candleIndex}-${currentCandle.high}`,
          price: currentCandle.high, // We keep the pixel Y-coordinate for drawing/merging
          levelType: 'resistance',
          strength: 0,
          touchCount: 0,
          firstCandleIndex: currentCandle.candleIndex,
          lastCandleIndex: currentCandle.candleIndex,
          distanceFromCurrentPrice: Math.abs(levelPrice - currentPriceY), // Now comparing price to price!          
          confidence: 70,
          timestamp: analysisTimestamp,
        });
      }

      // Check for Swing Low (Support)
      const isSwingLow = leftCandles.every(c => currentCandle.low >= c.low) &&
                         rightCandles.every(c => currentCandle.low >= c.low);
      if (isSwingLow) {
        const levelPrice = calibration.getPriceForY(currentCandle.low) || currentCandle.low;
        potentialLevels.push({
          id: `S-${currentCandle.candleIndex}-${currentCandle.low}`,
          price: currentCandle.low, // Pixel Y-coordinate
          levelType: 'support',
          strength: 0,
          touchCount: 0,
          firstCandleIndex: currentCandle.candleIndex,
          lastCandleIndex: currentCandle.candleIndex,
          distanceFromCurrentPrice: Math.abs(levelPrice - currentPriceY), // Now comparing price to price!          
          confidence: 70,
          timestamp: analysisTimestamp,
        });
      }
    }

    // Sort potential levels by price (Y-coordinate) for easier merging
    // Lower Y-coordinate means higher price, so sorting ascending groups similar price levels.
    potentialLevels.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));

    // 2. Merge nearby levels and calculate initial touch count/strength
    const mergedLevels: SupportResistanceLevel[] = [];
    if (potentialLevels.length > 0) {
      let currentMergedLevel = { ...potentialLevels[0] };

      for (let i = 1; i < potentialLevels.length; i++) {
        const level = potentialLevels[i];
        // If the current level is within the merge threshold of the current merged level
        if (Math.abs(level.price - currentMergedLevel.price) <= MERGE_THRESHOLD_PX) {
          // Merge: average price, increment touch count, extend candle index range, update confidence
          currentMergedLevel.price = (currentMergedLevel.price + level.price) / 2; // Average price
          currentMergedLevel.touchCount++; // Each merged swing point contributes to touch count
          currentMergedLevel.firstCandleIndex = Math.min(currentMergedLevel.firstCandleIndex, level.firstCandleIndex);
          currentMergedLevel.lastCandleIndex = Math.max(currentMergedLevel.lastCandleIndex, level.lastCandleIndex);
          currentMergedLevel.confidence = Math.max(currentMergedLevel.confidence, level.confidence); // Take max confidence
          currentMergedLevel.timestamp = analysisTimestamp; // Update timestamp to current analysis time
        } else {
          // If not close enough, push the current merged level and start a new one
          mergedLevels.push(currentMergedLevel);
          currentMergedLevel = { ...level };
        }
      }
      mergedLevels.push(currentMergedLevel); // Push the last merged level
    }

    // 3. Recalculate touch counts and strength based on all candles for merged levels
    // This provides a more accurate touch count than just merging swing points
    for (const level of mergedLevels) {
      let actualTouchCount = 0;
      let lastTouchCandleIndex = level.firstCandleIndex;

      for (let i = 0; i < candles.length; i++) {
        const candle: Candle = candles[i];
        // A touch is when high or low is within a small pixel range of the level price
        const isTouched = (candle.high <= level.price + TOUCH_TOLERANCE_PX && candle.high >= level.price - TOUCH_TOLERANCE_PX) ||
                          (candle.low <= level.price + TOUCH_TOLERANCE_PX && candle.low >= level.price - TOUCH_TOLERANCE_PX);
        if (isTouched) {
          actualTouchCount++;
          if (candle.candleIndex !== undefined) {
            lastTouchCandleIndex = Math.max(lastTouchCandleIndex, candle.candleIndex);
          }
        }
      }
      level.touchCount = actualTouchCount;
      level.lastCandleIndex = lastTouchCandleIndex;
      level.distanceFromCurrentPrice = Math.abs(level.price - currentPriceY);

      // Heuristic for strength: more touches and longer duration (candle range) increase strength
      const duration = level.lastCandleIndex - level.firstCandleIndex + 1;
      level.strength = Math.min(100, (level.touchCount * 15) + (duration / 10)); // Adjust multipliers as needed
      level.confidence = Math.min(100, level.confidence + (level.touchCount * 10)); // Boost confidence with touches

      // Refine level type based on strength and touch count
      if (level.touchCount >= MIN_TOUCH_COUNT && level.strength >= MIN_STRENGTH && level.confidence >= MIN_CONFIDENCE) {
        if (level.levelType.includes('support')) {
          level.levelType = level.strength > 70 ? 'major_support' : 'support';
          if (level.touchCount > 2) level.levelType = 'retested_support';
        } else { // resistance
          level.levelType = level.strength > 70 ? 'major_resistance' : 'resistance';
          if (level.touchCount > 2) level.levelType = 'retested_resistance';
        }
      } else {
        // If it doesn't meet minimum criteria, mark as weak or filter out later
        level.levelType = level.levelType.includes('support') ? 'weak_support' : 'weak_resistance';
      }
    }

    // 4. Filter out very weak levels and levels created by noise
    const filteredLevels = mergedLevels.filter(level =>
      level.touchCount >= MIN_TOUCH_COUNT &&
      level.strength >= MIN_STRENGTH &&
      level.confidence >= MIN_CONFIDENCE
    );

    // Separate into support and resistance lists
    srData.supportList = filteredLevels.filter(level => level.levelType.includes('support'));
    srData.resistanceList = filteredLevels.filter(level => level.levelType.includes('resistance'));

    // Sort lists by price (Y-coordinate)
    // For pixel Y-coordinates:
    // Supports: Higher Y-coordinate means lower price. We want supports below current price, so sort descending by Y.
    // Resistances: Lower Y-coordinate means higher price. We want resistances above current price, so sort ascending by Y.
    srData.supportList.sort((a: SupportResistanceLevel, b: SupportResistanceLevel) => b.price - a.price); // Highest Y (lowest price) first, so levels below current price appear first
    srData.resistanceList.sort((a: SupportResistanceLevel, b: SupportResistanceLevel) => (a.price ?? 0) - (b.price ?? 0)); // Lowest Y (highest price) first

    // 5. Find Nearest Support and Resistance

    // 5. Find Nearest Support and Resistance
    let nearestSupport: SupportResistanceLevel | null = null;
    let minDistanceSupport = Infinity;
    for (const support of srData.supportList) {
      if (support.price > currentPriceY) {
        const distance = support.price - currentPriceY;
        if (distance < minDistanceSupport) {
          minDistanceSupport = distance;
          nearestSupport = support;
        }
      }
    }
    srData.nearestSupport = nearestSupport;

    let nearestResistance: SupportResistanceLevel | null = null;
    let minDistanceResistance = Infinity;
    for (const resistance of srData.resistanceList) {
      if (resistance.price < currentPriceY) {
        const distance = currentPriceY - resistance.price;
        if (distance < minDistanceResistance) {
          minDistanceResistance = distance;
          nearestResistance = resistance;
        }
      }
    }
    srData.nearestResistance = nearestResistance;

    if (srData.nearestSupport) {
      if (calibration) {
        const price = calibration.getPriceForY(srData.nearestSupport.price);
        if (price !== null) {
          srData.nearestSupport.displayPrice = price.toFixed(4);
          const dist = calibration.getDistanceForPixels(minDistanceSupport);
          srData.nearestSupport.displayDistance = dist !== null ? dist.toFixed(4) : 'N/A';
        } else {
          srData.nearestSupport.displayPrice = '~' + Math.round(srData.nearestSupport.price) + 'px';
          srData.nearestSupport.displayDistance = Math.round(minDistanceSupport) + 'px';
        }
      } else {
        srData.nearestSupport.displayPrice = '~' + Math.round(srData.nearestSupport.price) + 'px';
        srData.nearestSupport.displayDistance = Math.round(minDistanceSupport) + 'px';
      }
    }

    if (srData.nearestResistance) {
      if (calibration) {
        const price = calibration.getPriceForY(srData.nearestResistance.price);
        if (price !== null) {
          srData.nearestResistance.displayPrice = price.toFixed(4);
          const dist = calibration.getDistanceForPixels(minDistanceResistance);
          srData.nearestResistance.displayDistance = dist !== null ? dist.toFixed(4) : 'N/A';
        } else {
          srData.nearestResistance.displayPrice = '~' + Math.round(srData.nearestResistance.price) + 'px';
          srData.nearestResistance.displayDistance = Math.round(minDistanceResistance) + 'px';
        }
      } else {
        srData.nearestResistance.displayPrice = '~' + Math.round(srData.nearestResistance.price) + 'px';
        srData.nearestResistance.displayDistance = Math.round(minDistanceResistance) + 'px';
      }
    }

    LoggerService.info('VisionManager: S&R analysis complete.');
    return srData;
  }
}
