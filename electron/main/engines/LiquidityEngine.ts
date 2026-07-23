import { LoggerService } from '../LoggerService';
import { config } from '../config';
import { 
  Candle, MarketState, SupportResistanceData, TrendData, 
  MarketStructureData, BosChochData, LiquidityData, LiquidityObject, SweepType, LiquiditySweep, OrderBlockData, 
  FvgData, PriceActionData, ConfluenceData, TradeScoreData, 
  AIDecisionData, AIReasoning, TrendDirection, ReasonCategory, ReasonPriority, AIReason, AIDecisionType
, LiquidityType } from '../vision';
import { OcrResult } from '../ocr';


export class LiquidityEngine {
  public lastLiquidityData: any = null;

  public analyzeLiquidityAndSweeps(
    candles: Candle[] | null,
    _trendData: TrendData | null,
    marketStructureData: MarketStructureData | null,
    bosChochData: BosChochData | null,
    _supportResistanceData: SupportResistanceData | null,
    currentPriceY: number | null,
    previousLiquidityData: LiquidityData | null
  ): LiquidityData | null {
    LoggerService.info('VisionManager: Starting Liquidity & Liquidity Sweep Engine.');

    if (!candles || candles.length < config.vision.minCandlesForMarketStructure || !marketStructureData || !marketStructureData.allSwingPoints || marketStructureData.allSwingPoints.length < 2 || currentPriceY === null) {
      LoggerService.warn('VisionManager: Insufficient candles, market structure data, or current price for Liquidity analysis. Returning null.');
      return null;
    }

    const analysisTimestamp = Date.now();
    const liquidityData: LiquidityData = {
      nearestBuySideLiquidity: null,
      nearestSellSideLiquidity: null,
      liquidityList: previousLiquidityData?.liquidityList ? [...previousLiquidityData.liquidityList] : [],
      latestSweep: null,
      sweepHistory: previousLiquidityData?.sweepHistory ? [...previousLiquidityData.sweepHistory] : [],
      liquiditySummary: 'No significant liquidity detected.',
      overallConfidence: 0,
    };

    const MIN_LIQUIDITY_STRENGTH = 20; // Minimum strength for a liquidity object to be considered
    const EQUAL_HIGH_LOW_TOLERANCE_PX = 3; // Max pixel difference for equal highs/lows
    const SWEEP_DEPTH_THRESHOLD_PX = 1; // Minimum pixel penetration for a sweep
    const SWEEP_REJECTION_WICK_RATIO = 0.6; // Wick must be at least 60% of the candle's total height for strong rejection
    const MERGE_LIQUIDITY_THRESHOLD_PX = 5; // Pixel distance to merge nearby liquidity levels

    // --- 1. Detect Liquidity Objects ---
    const potentialLiquidityObjects: LiquidityObject[] = [];

    // From Market Structure Swing Points (External Liquidity)
    for (const swingPoint of marketStructureData.allSwingPoints) {
      const type: LiquidityType = swingPoint.type === 'high' ? 'sell_side_liquidity' : 'buy_side_liquidity';
      potentialLiquidityObjects.push({
        id: `LIQ-${type}-${swingPoint.candleIndex}-${swingPoint.price}`,
        type: type,
        price: swingPoint.price,
        candleIndex: swingPoint.candleIndex,
        strength: swingPoint.strength,
        confidence: swingPoint.confidence,
        firstCandleIndex: swingPoint.candleIndex,
        lastCandleIndex: swingPoint.candleIndex,
        distanceFromCurrentPrice: Math.abs(swingPoint.price - currentPriceY),
        status: 'active',
        timestamp: analysisTimestamp,
      });
    }

    // Detect Equal Highs/Lows (Engineered Liquidity)
    // Sort by price to easily find nearby levels
    potentialLiquidityObjects.sort((a, b) => a.price - b.price);

    for (let i = 0; i < potentialLiquidityObjects.length; i++) {
      const currentLiq = potentialLiquidityObjects[i];
      if (currentLiq.type === 'sell_side_liquidity') { // Check for Equal Highs
        for (let j = i + 1; j < potentialLiquidityObjects.length; j++) {
          const nextLiq = potentialLiquidityObjects[j];
          if (nextLiq.type === 'sell_side_liquidity' && Math.abs(currentLiq.price - nextLiq.price) <= EQUAL_HIGH_LOW_TOLERANCE_PX) {
            // Found Equal Highs
            const equalHighPrice = (currentLiq.price + nextLiq.price) / 2;
            potentialLiquidityObjects.push({
              id: `EQLH-${currentLiq.candleIndex}-${nextLiq.candleIndex}-${equalHighPrice}`,
              type: 'equal_highs',
              price: equalHighPrice,
              candleIndex: Math.max(currentLiq.candleIndex, nextLiq.candleIndex),
              strength: Math.min(100, currentLiq.strength + nextLiq.strength + 20), // Boost strength
              confidence: Math.min(100, currentLiq.confidence + nextLiq.confidence / 2 + 10), // Boost confidence
              firstCandleIndex: Math.min(currentLiq.firstCandleIndex, nextLiq.firstCandleIndex),
              lastCandleIndex: Math.max(currentLiq.lastCandleIndex, nextLiq.lastCandleIndex),
              distanceFromCurrentPrice: Math.abs(equalHighPrice - currentPriceY),
              status: 'active',
              timestamp: analysisTimestamp,
            });
            // Mark original liquidity as part of engineered liquidity
            currentLiq.type = 'engineered_liquidity';
            nextLiq.type = 'engineered_liquidity';
          }
        }
      } else if (currentLiq.type === 'buy_side_liquidity') { // Check for Equal Lows
        for (let j = i + 1; j < potentialLiquidityObjects.length; j++) {
          const nextLiq = potentialLiquidityObjects[j];
          if (nextLiq.type === 'buy_side_liquidity' && Math.abs(currentLiq.price - nextLiq.price) <= EQUAL_HIGH_LOW_TOLERANCE_PX) {
            // Found Equal Lows
            const equalLowPrice = (currentLiq.price + nextLiq.price) / 2;
            potentialLiquidityObjects.push({
              id: `EQLL-${currentLiq.candleIndex}-${nextLiq.candleIndex}-${equalLowPrice}`,
              type: 'equal_lows',
              price: equalLowPrice,
              candleIndex: Math.max(currentLiq.candleIndex, nextLiq.candleIndex),
              strength: Math.min(100, currentLiq.strength + nextLiq.strength + 20), // Boost strength
              confidence: Math.min(100, currentLiq.confidence + nextLiq.confidence / 2 + 10), // Boost confidence
              firstCandleIndex: Math.min(currentLiq.firstCandleIndex, nextLiq.firstCandleIndex),
              lastCandleIndex: Math.max(currentLiq.lastCandleIndex, nextLiq.lastCandleIndex),
              distanceFromCurrentPrice: Math.abs(equalLowPrice - currentPriceY),
              status: 'active',
              timestamp: analysisTimestamp,
            });
            // Mark original liquidity as part of engineered liquidity
            currentLiq.type = 'engineered_liquidity';
            nextLiq.type = 'engineered_liquidity';
          }
        }
      }
    }

    // Filter and merge liquidity objects
    const filteredLiquidity: LiquidityObject[] = [];
    potentialLiquidityObjects.sort((a, b) => a.price - b.price); // Sort by price for merging

    if (potentialLiquidityObjects.length > 0) {
      // The previous comment indicated a duplicate, but only one declaration exists.
      let currentMergedLiq: LiquidityObject = { ...potentialLiquidityObjects[0] };
      for (let i = 1; i < potentialLiquidityObjects.length; i++) { // Added explicit type for 'liq'
        const liq = potentialLiquidityObjects[i];
        if (Math.abs(liq.price - currentMergedLiq.price) <= MERGE_LIQUIDITY_THRESHOLD_PX && liq.type === currentMergedLiq.type && liq.status === currentMergedLiq.status) {
          // Merge similar types
          currentMergedLiq.price = (currentMergedLiq.price + liq.price) / 2;
          currentMergedLiq.strength = Math.max(currentMergedLiq.strength, liq.strength);
          currentMergedLiq.confidence = Math.max(currentMergedLiq.confidence, liq.confidence);
          currentMergedLiq.firstCandleIndex = Math.min(currentMergedLiq.firstCandleIndex, liq.firstCandleIndex);
          currentMergedLiq.lastCandleIndex = Math.max(currentMergedLiq.lastCandleIndex, liq.lastCandleIndex);
        } else {
          if (currentMergedLiq.strength >= MIN_LIQUIDITY_STRENGTH) {
            filteredLiquidity.push(currentMergedLiq);
          }
          currentMergedLiq = { ...liq };
        }
      }
      if (currentMergedLiq.strength >= MIN_LIQUIDITY_STRENGTH) {
        filteredLiquidity.push(currentMergedLiq);
      }
    }
    liquidityData.liquidityList = filteredLiquidity;

    // --- 2. Detect Liquidity Sweeps ---
    const lastProcessedCandleIndex = liquidityData.sweepHistory.length > 0
      ? Math.max(...liquidityData.sweepHistory.map(e => e.endCandleIndex))
      : -1;

    for (let i = Math.max(0, lastProcessedCandleIndex + 1); i < candles.length; i++) {
      const currentCandle = candles[i];
      if (currentCandle.candleIndex === undefined) continue;

      for (const liqObject of liquidityData.liquidityList) {
        if (liqObject.status !== 'active') continue; // Only sweep active liquidity

        let isSweep = false;
        let sweepDirection: 'bullish' | 'bearish' | null = null; // Explicitly type
        let sweepType: SweepType = 'valid_liquidity_grab';
        let sweepDepth = 0;
        let rejectionStrength = 0;
        let associatedEvent: 'BOS' | 'CHOCH' | 'rejection' | 'reversal' | null = null;

        // Bullish Sweep: Price dips below Buy Side Liquidity, then reverses
        if (liqObject.type.includes('buy_side_liquidity') || liqObject.type.includes('equal_lows')) {
          if (currentCandle.low < liqObject.price - SWEEP_DEPTH_THRESHOLD_PX) { // Candle low penetrates liquidity
            if (currentCandle.close > liqObject.price) { // Closes back above liquidity
              isSweep = true;
              sweepDirection = 'bullish';
              sweepDepth = liqObject.price - currentCandle.low;
              rejectionStrength = (currentCandle.close - currentCandle.low) / currentCandle.totalHeight;
              if (rejectionStrength >= SWEEP_REJECTION_WICK_RATIO) associatedEvent = 'rejection';
            } else if (currentCandle.low < currentCandle.open && currentCandle.close > currentCandle.open) { // Long lower wick, bullish close
              isSweep = true;
              sweepDirection = 'bullish';
              sweepDepth = liqObject.price - currentCandle.low;
              rejectionStrength = (currentCandle.open - currentCandle.low) / currentCandle.totalHeight;
              if (rejectionStrength >= SWEEP_REJECTION_WICK_RATIO) associatedEvent = 'rejection';
            }
          }
        }
        // Bearish Sweep: Price pushes above Sell Side Liquidity, then reverses
        else if (liqObject.type.includes('sell_side_liquidity') || liqObject.type.includes('equal_highs')) {
          if (currentCandle.high > liqObject.price + SWEEP_DEPTH_THRESHOLD_PX) { // Candle high penetrates liquidity
            if (currentCandle.close < liqObject.price) { // Closes back below liquidity
              isSweep = true;
              sweepDirection = 'bearish';
              sweepDepth = currentCandle.high - liqObject.price;
              rejectionStrength = (currentCandle.high - currentCandle.close) / currentCandle.totalHeight;
              if (rejectionStrength >= SWEEP_REJECTION_WICK_RATIO) associatedEvent = 'rejection';
            } else if (currentCandle.high > currentCandle.open && currentCandle.close < currentCandle.open) { // Long upper wick, bearish close
              isSweep = true;
              sweepDirection = 'bearish';
              sweepDepth = currentCandle.high - liqObject.price;
              rejectionStrength = (currentCandle.high - currentCandle.open) / currentCandle.totalHeight;
              if (rejectionStrength >= SWEEP_REJECTION_WICK_RATIO) associatedEvent = 'rejection';
            }
          }
        }

        if (isSweep && sweepDirection) {
          // Check for BOS/CHOCH immediately after sweep
          const latestBosChoch = bosChochData?.latestBOS || bosChochData?.latestCHOCH;
          if (latestBosChoch && latestBosChoch.breakingCandleIndex === currentCandle.candleIndex) {
            associatedEvent = latestBosChoch.eventType;
            sweepType = latestBosChoch.eventType === 'BOS' ? 'sweep_bos' : 'sweep_choch';
          } else if (associatedEvent === 'rejection') {
            sweepType = 'sweep_rejection';
          }

          const sweepConfidence = Math.min(100, currentCandle.confidence + liqObject.confidence / 2 + (rejectionStrength * 50));
          const sweepStrength = Math.min(100, liqObject.strength + (sweepDepth * 10) + (rejectionStrength * 30));

          const newSweep: LiquiditySweep = {
            id: `SWEEP-${sweepDirection}-${currentCandle.candleIndex}-${analysisTimestamp}`,
            sweepType: sweepType,
            direction: sweepDirection,
            priceLevel: liqObject.price,
            startCandleIndex: liqObject.candleIndex,
            endCandleIndex: currentCandle.candleIndex,
            triggerCandleIndex: currentCandle.candleIndex,
            confirmationCandleIndex: currentCandle.candleIndex, // For now, same as trigger
            liquidityRemoved: { ...liqObject, status: 'swept' }, // Mark as swept
            sweepStrength: sweepStrength,
            confidence: sweepConfidence,
            timestamp: analysisTimestamp,
            sweepDepth: sweepDepth,
            rejectionStrength: Math.round(rejectionStrength * 100),
            associatedEvent: associatedEvent,
          };
          liquidityData.sweepHistory.push(newSweep);
          liquidityData.latestSweep = newSweep;
          liqObject.status = 'swept'; // Update the status of the liquidity object
          LoggerService.info(`VisionManager: Detected ${newSweep.sweepType} at price Y: ${newSweep.priceLevel} by candle ${newSweep.endCandleIndex}.`);
        }
      }
    }

    // --- 3. Calculate Output Metrics ---
    // Nearest Buy Side Liquidity
    let nearestBSL: LiquidityObject | null = null;
    let minDistanceBSL = Infinity;
    for (const liq of liquidityData.liquidityList) {
      if (liq.type.includes('buy_side_liquidity') && liq.status === 'active' && liq.price > currentPriceY) { // Below current price (higher Y)
        const distance = liq.price - currentPriceY;
        if (distance < minDistanceBSL) {
          minDistanceBSL = distance;
          nearestBSL = liq;
        }
      }
    }
    liquidityData.nearestBuySideLiquidity = nearestBSL;

    // Nearest Sell Side Liquidity
    let nearestSSL: LiquidityObject | null = null;
    let minDistanceSSL = Infinity;
    for (const liq of liquidityData.liquidityList) {
      if (liq.type.includes('sell_side_liquidity') && liq.status === 'active' && liq.price < currentPriceY) { // Above current price (lower Y)
        const distance = currentPriceY - liq.price;
        if (distance < minDistanceSSL) {
          minDistanceSSL = distance;
          nearestSSL = liq;
        }
      }
    }
    liquidityData.nearestSellSideLiquidity = nearestSSL;

    // Overall Confidence
    let totalConfidence = 0;
    let count = 0;
    liquidityData.liquidityList.forEach((liq: LiquidityObject) => { totalConfidence += liq.confidence; count++; }); // Added explicit type for 'liq'
    liquidityData.sweepHistory.slice(-5).forEach((sweep: LiquiditySweep) => { totalConfidence += sweep.confidence; count++; }); // Consider recent sweeps // Added explicit type for 'sweep'
    liquidityData.overallConfidence = count > 0 ? Math.round(totalConfidence / count) : 0;

    liquidityData.liquiditySummary = `Detected ${liquidityData.liquidityList.filter(l => l.status === 'active').length} active liquidity levels. Latest sweep: ${liquidityData.latestSweep?.sweepType || 'None'}.`;

    LoggerService.info(`VisionManager: Liquidity analysis complete. Found ${liquidityData.liquidityList.length} liquidity objects and ${liquidityData.sweepHistory.length} sweeps.`);
    this.lastLiquidityData = liquidityData; // Store for incremental analysis
    return liquidityData;
  }

}
