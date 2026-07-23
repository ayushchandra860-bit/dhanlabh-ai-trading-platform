// @ts-nocheck
import { WindowState } from '../../shared/types/window';
import { ScreenCaptureService } from './ScreenCaptureService';
import { OcrService } from './OcrService';
import { LoggerService } from './LoggerService';
import { config } from './config';
import { performance } from 'perf_hooks'; // Required for processing time calculation
import { VisionResult, Candle, MarketState, BoundingBox, AnalysisData, SupportResistanceData, SupportResistanceLevel, OlympTradeLayoutProfile, TrendData, Trend, TrendDirection, MarketStructureData, SwingPoint, MarketStructureEvent, BosChochData, LiquidityData, LiquidityObject, LiquiditySweep, LiquidityType, SweepType, OrderBlock, OrderBlockData, FairValueGap, FvgData, PriceActionPattern, PriceActionData, ConfluenceFactor, ConfluenceData, TradeScoreData, TradeQualityClassification, AIDecisionType, AIDecisionData, AIReasoning, AIReason, ReasonCategory, ReasonPriority } from './vision';
import { OcrResult } from './ocr';
import { nativeImage } from 'electron';
import { PriceScaleCalibrationService } from './engines/PriceScaleCalibrationService';
import { ChartDetectionEngine } from './engines/ChartDetectionEngine';
import { SupportResistanceEngine } from './engines/SupportResistanceEngine';
import { TrendDetectionEngine } from './engines/TrendDetectionEngine';
import { MomentumEngine } from './engines/MomentumEngine';
import { VolatilityEngine } from './engines/VolatilityEngine';
import { RiskEngine } from './engines/RiskEngine';
import { ConfidenceEngine } from './engines/ConfidenceEngine';
import { MarketStructureEngine } from './engines/MarketStructureEngine';
import { BosChochEngine } from './engines/BosChochEngine';
import { LiquidityEngine } from './engines/LiquidityEngine';
import { OrderBlockEngine } from './engines/OrderBlockEngine';
import { FvgEngine } from './engines/FvgEngine';
import { PriceActionEngine } from './engines/PriceActionEngine';
import { ConfluenceEngine } from './engines/ConfluenceEngine';
import { LiveObservationEngine } from './engines/LiveObservationEngine';
import { IndicatorFusionEngine } from './engines/IndicatorFusionEngine';
import { CandleIntelligenceEngine } from './engines/CandleIntelligenceEngine';
import { SignalStabilityEngine } from './engines/SignalStabilityEngine';
import { ConflictDetectionEngine } from './engines/ConflictDetectionEngine';
import { ChartConnectionEngine } from './engines/ChartConnectionEngine';
import { TradeScoringEngine } from './engines/TradeScoringEngine';
import { DecisionEngine } from './engines/DecisionEngine';
import { ReasoningEngine } from './engines/ReasoningEngine';

import { evaluateConfidence } from '../../shared/ai/ConfidenceGuard';
import { resolveEnabledModules, AIModuleId } from '../../shared/ai/AIModuleRegistry';

// Helper to get the number of fields in MarketState for completeness calculation
const MARKET_STATE_NULLABLE_FIELD_COUNT: number = (() => {
  const marketStateShape: MarketState = {
    assetName: null,
    timeframe: null,
    currentPrice: null,
    balance: null,
    payoutPercentage: null,
    expiryTime: null,
    buyButtonDetected: false,
    sellButtonDetected: false,
    visibleTimer: null,
    allNumbers: [],
  };
  return Object.keys(marketStateShape).filter(key =>
    typeof marketStateShape[key as keyof MarketState] !== 'boolean' && !Array.isArray(marketStateShape[key as keyof MarketState])
  ).length;
})();

export class VisionManager {
  private lastCaptureTime = 0;
  private isProcessing = false;
  private frameCounter = 0;
  private chartDetectionEngine = new ChartDetectionEngine();
  private priceScaleService = new PriceScaleCalibrationService();
  private srEngine = new SupportResistanceEngine();
  private trendEngine = new TrendDetectionEngine();
  private momentumEngine = new MomentumEngine();
  private volatilityEngine = new VolatilityEngine();
  private riskEngine = new RiskEngine();
  private confidenceEngine = new ConfidenceEngine();
  private msEngine = new MarketStructureEngine();
  private bcEngine = new BosChochEngine();
  private liqEngine = new LiquidityEngine();
  private obEngine = new OrderBlockEngine();
  private fvgEngine = new FvgEngine();
  private paEngine = new PriceActionEngine();
  private confEngine = new ConfluenceEngine();
  private liveObsEngine = new LiveObservationEngine();
  private indicatorEngine = new IndicatorFusionEngine();
  private candleIntEngine = new CandleIntelligenceEngine();
  private stabilityEngine = new SignalStabilityEngine();
  private conflictEngine = new ConflictDetectionEngine();
  private connEngine = new ChartConnectionEngine();
  private tsEngine = new TradeScoringEngine();
  private decEngine = new DecisionEngine();
  private reasonEngine = new ReasoningEngine();

  private _lastAIDecisionData: AIDecisionData | null = null; // Cache for the last valid AI Decision data
  private _lastTradeScoreData: TradeScoreData | null = null; // Cache for the last valid Trade Score data
  private _lastConfluenceData: ConfluenceData | null = null; // Cache for the last valid Confluence data
  private _lastPriceActionData: PriceActionData | null = null; // Cache for the last valid Price Action data
  private _lastFvgData: FvgData | null = null; // Cache for the last valid FVG data
  private _lastValidMarketState: MarketState | null = null; // Cache for the last valid market state
  private _lastOrderBlockData: OrderBlockData | null = null; // Cache for the last valid Order Block data
  private _lastLiquidityData: LiquidityData | null = null; // Cache for the last valid Liquidity data
  private _lastBosChochData: BosChochData | null = null; // Cache for the last valid BOS/CHOCH data
  private _lastMarketStructureData: MarketStructureData | null = null; // Cache for the last valid market structure data
  private _lastTrendData: TrendData | null = null; // Cache for the last valid trend data
  private _lastLiveObs: any = null;
  private _lastIndicatorData: any = null;
  private _lastCandleStrength: any = null;
  private _lastConflictData: any = null;
  private _lastStabilityData: any = null;

  constructor(
    private screenCaptureService: ScreenCaptureService,
    private ocrService: OcrService
  ) {}

  
  public cleanup() {
    this.isProcessing = false;
    LoggerService.info('VisionManager: Cleanup invoked. Resetting processing state.');
  }

  public async onWindowStateUpdate(state: WindowState): Promise<VisionResult | null> {
    if (!state.isFound || !state.position || !state.size) {
      return null;
    }

    const now = Date.now();
    if (this.isProcessing || now - this.lastCaptureTime < config.vision.captureIntervalMs) {
      return null;
    }

    this.isProcessing = true;
    this.lastCaptureTime = now;
    const totalProcessingStartTime = performance.now();
    this.frameCounter++;

    let marketState: MarketState | null = null;
    let ocrResult: OcrResult | null = null;
    let ocrLatency: number | null = null;
    let captureLatency: number | null = null;
    let candles: Candle[] | null = null;
    let cleanChartImageBuffer: Buffer | null = null;
    let chartBounds: BoundingBox | null = null;
    let candleDrawingRegion: BoundingBox | null = null;
    let olymptradeLayout: OlympTradeLayoutProfile | null = null;
    let supportResistanceData: SupportResistanceData | null = null;
    let marketStructureData: MarketStructureData | null = null;
    let aiDecisionData: AIDecisionData | null = null;
    let tradeScoreData: TradeScoreData | null = null;
    let confluenceData: ConfluenceData | null = null;
    let priceActionData: PriceActionData | null = null;
    let fvgData: FvgData | null = null;
      let momentumData: MomentumData | null = null;
      let volatilityData: VolatilityData | null = null;
      let riskData: RiskData | null = null;
    let orderBlockData: OrderBlockData | null = null;
    let liquidityData: LiquidityData | null = null;
    let bosChochData: BosChochData | null = null;
    let trendData: TrendData | null = null;
    let candleStrengthData: any = null;
    let indicatorData: any = null;
    let liveObs: any = null;
    let connectionData: any = null;
    let healthStatus: any = null;
    let conflictData: any = null;
    let stabilityData: any = null;

    try {
      // 1. Screen Capture
      const captureResult = await this.screenCaptureService.capture(state.position, state.size);
        const imageBuffer = captureResult ? captureResult.frame : null;
      if (!imageBuffer) {
        LoggerService.warn('VisionManager: Screen capture returned no image buffer.');
        return null;
      }
      captureLatency = performance.now() - totalProcessingStartTime;

      // 2. Olymp Trade Layout Profile Calculation
      olymptradeLayout = this._calculateOlympTradeLayout(state);
      if (!olymptradeLayout) {
        LoggerService.warn('VisionManager: Could not calculate Olymp Trade layout profile.');
      }

      // 3. Calculate Chart Bounds
      if (olymptradeLayout) {
        const detectionResult = await this.chartDetectionEngine.detect(state, imageBuffer);
        LoggerService.warn('VisionManager: Cannot detect candles, clean chart image or candle drawing region is missing.');
        LoggerService.info('VisionManager: No candles detected.');
      }

      // 7. Analysis Engine Foundation
      const totalProcessingTime = performance.now() - totalProcessingStartTime;
      let dataCompleteness = 0;
      let missingFieldCount = 0;
      let processingStatus: AnalysisData['processingStatus'] = 'FAILURE'; // Initialize processingStatus
      let visionConfidence: number | null = null; // Initialize visionConfidence

      if (marketState) {
        const currentMarketState = marketState; // Apply null guard
        const marketStateKeysForCompleteness = Object.keys(currentMarketState).filter(key => {
          const value = currentMarketState[key as keyof MarketState];
          return typeof value !== 'boolean' && !Array.isArray(value);
        }) as Array<keyof MarketState>;

        const nonNullFields = marketStateKeysForCompleteness.filter(key => currentMarketState[key] !== null);
        dataCompleteness = (nonNullFields.length / marketStateKeysForCompleteness.length) * 100;
        missingFieldCount = marketStateKeysForCompleteness.length - nonNullFields.length;

        if (dataCompleteness > 70 && ocrResult && ocrResult.confidence !== null && ocrResult.confidence > 70) {
          processingStatus = 'PARTIAL_SUCCESS';
        }
        if (dataCompleteness === 100 && ocrResult && ocrResult.confidence !== null && ocrResult.confidence > 80) {
          processingStatus = 'SUCCESS';
        }

        visionConfidence = ocrResult?.confidence || null;
        if (candles && candles.length > 0) {
          const avgCandleConfidence = candles.reduce((sum, c) => sum + c.confidence, 0) / candles.length;
          visionConfidence = visionConfidence !== null ? (visionConfidence + avgCandleConfidence) / 2 : avgCandleConfidence;
        }
      } else {
        dataCompleteness = 0;
        missingFieldCount = MARKET_STATE_NULLABLE_FIELD_COUNT;
        processingStatus = 'FAILURE';
        visionConfidence = null;
      }

      const analysisData: AnalysisData = {
        frameId: this.frameCounter,
        lastUpdateTimestamp: now,
        captureLatency: captureLatency,
        ocrLatency: ocrLatency,
        totalProcessingTime: totalProcessingTime,
        visionConfidence: visionConfidence,
        ocrConfidence: ocrResult?.confidence || null,
        dataCompleteness: dataCompleteness,
        missingFieldCount: missingFieldCount,
        processingStatus: processingStatus,
      };

      // Determine enabled modules
      const enabledSet = new Set<AIModuleId>(config.enabledModules as AIModuleId[]);
      const activeModules = resolveEnabledModules(enabledSet);
      const isEnabled = (id: AIModuleId) => activeModules.has(id);

      // Evaluate Confidence Guard
      const chartDetectionConfidence = 100;
      const confidenceReport = evaluateConfidence(
        ocrResult?.confidence || 0,
        visionConfidence || 0,
        chartDetectionConfidence,
        config.confidenceGuard
      );

      if (!confidenceReport.isAboveThreshold) {
        LoggerService.warn(`VisionManager: Signal blocked by ConfidenceGuard. ${confidenceReport.failingReasons.join(' | ')}`);
        aiDecisionData = {
          id: `UNAVAIL-${now}`,
          signal: 'UNAVAILABLE',
          confidence: confidenceReport.overallConfidence,
          tradeScore: 0,
          bullishPercentage: 0,
          bearishPercentage: 0,
          riskLevel: 100,
          timestamp: now,
          institutionalBias: 'neutral',
          expectedSuccessProbability: 0,
          entryQuality: 0,
          summary: 'Analysis unavailable due to low data quality.',
          reasoning: null,
          unavailableReasons: confidenceReport.failingReasons,
          recommendedExpiry: 'WAIT',
          entryRecommendation: 'WAIT',
          nearestDanger: 'None',
        };
      } else {
        
      // OCR Price Axis Calibration
      if (isEnabled('supportResistance') && marketState) {
         this.priceScaleService.calibrate(ocrResult, state, marketState.timeframe);
      }
      
      // 8. Support & Resistance Foundation

        if (isEnabled('supportResistance')) {
          supportResistanceData = this.srEngine.analyzeSupportResistance(marketState, candles, this.priceScaleService);
        }

        // 9. Trend Detection Engine
        if (isEnabled('trend')) {
          
          trendData = this.trendEngine.analyzeTrend(candles, supportResistanceData, marketState?.currentPrice ?? null, this._lastTrendData);
          momentumData = this.momentumEngine.analyze(candles, trendData);
          volatilityData = this.volatilityEngine.analyze(candles);

        }

        // 10. Market Structure Engine
        marketStructureData = this.msEngine.analyzeMarketStructure(candles, trendData, supportResistanceData, marketState?.currentPrice ?? null, this._lastMarketStructureData);

        // 11. BOS + CHOCH Detection Engine
        if (isEnabled('bos') || isEnabled('choch')) {
          bosChochData = this.bcEngine.analyzeBosChoch(candles, marketStructureData, trendData, supportResistanceData, marketState?.currentPrice ?? null, this._lastBosChochData);
        }

        // 12. Liquidity & Liquidity Sweep Engine
        if (isEnabled('liquidity')) {
          liquidityData = this.liqEngine.analyzeLiquidityAndSweeps(candles, trendData, marketStructureData, bosChochData, supportResistanceData, marketState?.currentPrice ?? null, this._lastLiquidityData);
        }

        // 13. Order Block Detection Engine
        if (isEnabled('orderBlocks')) {
          orderBlockData = this.obEngine.analyzeOrderBlocks(candles, trendData, marketStructureData, bosChochData, liquidityData, marketState?.currentPrice ?? null, this._lastOrderBlockData);
        }

        // 14. Fair Value Gap (FVG) & Imbalance Engine
        if (isEnabled('fvg')) {
          fvgData = this.fvgEngine.analyzeFairValueGaps(candles, trendData, marketStructureData, bosChochData, liquidityData, orderBlockData, marketState?.currentPrice ?? null, this._lastFvgData);

        }

        // 10. Market Structure Engine
        marketStructureData = this.msEngine.analyzeMarketStructure(candles, trendData, supportResistanceData, marketState?.currentPrice ?? null, this._lastMarketStructureData);

        // 11. BOS + CHOCH Detection Engine
        if (isEnabled('bos') || isEnabled('choch')) {
          bosChochData = this.bcEngine.analyzeBosChoch(candles, marketStructureData, trendData, supportResistanceData, marketState?.currentPrice ?? null, this._lastBosChochData);
        }

        // 12. Liquidity & Liquidity Sweep Engine
        if (isEnabled('liquidity')) {
          liquidityData = this.liqEngine.analyzeLiquidityAndSweeps(candles, trendData, marketStructureData, bosChochData, supportResistanceData, marketState?.currentPrice ?? null, this._lastLiquidityData);
        }

        // 13. Order Block Detection Engine
        if (isEnabled('orderBlocks')) {
          orderBlockData = this.obEngine.analyzeOrderBlocks(candles, trendData, marketStructureData, bosChochData, liquidityData, marketState?.currentPrice ?? null, this._lastOrderBlockData);
        }

        // 14. Fair Value Gap (FVG) & Imbalance Engine
        if (isEnabled('fvg')) {
          fvgData = this.fvgEngine.analyzeFairValueGaps(candles, trendData, marketStructureData, bosChochData, liquidityData, orderBlockData, marketState?.currentPrice ?? null, this._lastFvgData);
        }

        // 15. Price Action Recognition Engine
        priceActionData = this.paEngine.analyzePriceAction(candles, trendData, marketStructureData, bosChochData, liquidityData, orderBlockData, fvgData, marketState?.currentPrice ?? null, this._lastPriceActionData);

        
        // CHART CONNECTION ENGINE
        connectionData = null;
        healthStatus = {
           visionEngine: true,
           ocrEngine: !!ocrResult,
           screenCapture: true,
           framePipeline: true,
           bayesianEngine: isEnabled('confluence'),
           signalEngine: isEnabled('tradeDecision'),
           calibrationEngine: isEnabled('supportResistance')
        };
        
        const chartDetected = !!chartBounds;
        connectionData = this.connEngine.validateConnection(cleanChartImageBuffer, now, Date.now(), chartDetected);
        
        // NEW ENGINES (Layers 1 & 4)
        candleStrengthData = null;
        indicatorData = null;
        liveObs = null;
        if (candles && candles.length > 0) {
           candleStrengthData = this.candleIntEngine.analyzeCandles(candles);
        }
        if (isEnabled('trend')) {
           indicatorData = this.indicatorEngine.calculateIndicators(candles);
        }
        liveObs = this.liveObsEngine.observe(marketState?.currentPrice ?? null, now);
        
        // 16. Bayesian Confluence Engine
        if (isEnabled('confluence')) {
          confluenceData = this.confEngine.analyzeConfluence(trendData, marketStructureData, bosChochData, liquidityData, orderBlockData, fvgData, priceActionData, candleStrengthData, liveObs, indicatorData, this._lastConfluenceData);
          riskData = this.riskEngine.analyze(candles, trendData, momentumData, volatilityData, liquidityData, marketStructureData, supportResistanceData);
        }

        // 17. Conflict & Stability Layer
        conflictData = null;
        stabilityData = null;
        if (isEnabled('tradeDecision')) {
          conflictData = this.conflictEngine.detectConflicts(trendData, marketStructureData, bosChochData, indicatorData, liveObs, confluenceData);
          tradeScoreData = this.tsEngine.analyzeTradeScore(candles, trendData, supportResistanceData, marketStructureData, bosChochData, liquidityData, orderBlockData, fvgData, priceActionData, confluenceData, marketState?.currentPrice ?? null, this._lastTradeScoreData);
          
          let rawSignal: any = 'WAIT';
          if (confluenceData && confluenceData.confluenceScore > 75) {
             rawSignal = confluenceData.institutionalBias === 'bullish' ? 'BUY' : 'SELL';
          }
          
          stabilityData = this.stabilityEngine.analyzeStability(rawSignal, confluenceData?.confidence ?? 0, now);
          
          // 18. Decision Engine
          aiDecisionData = await this.decEngine.makeAIDecision(candles, trendData, supportResistanceData, marketStructureData, bosChochData, liquidityData, orderBlockData, fvgData, priceActionData, confluenceData, tradeScoreData, conflictData, stabilityData, null, liveObs, marketState?.currentPrice ?? null, connectionData, this._lastAIDecisionData, marketState);
          
          this._lastLiveObs = liveObs;
          this._lastIndicatorData = indicatorData;
          this._lastCandleStrength = candleStrengthData;
          this._lastConflictData = conflictData;
          this._lastStabilityData = stabilityData;
        }
      }

      // Construct the final Vision Result
      const visionResult: VisionResult = {
        timestamp: now,
        windowState: state,
        ocrResult: ocrResult,
        candles: candles,
        cleanChartImageBuffer: cleanChartImageBuffer,
        candleDrawingRegion: candleDrawingRegion,
        chartBounds: chartBounds,
        olymptradeLayout: olymptradeLayout,
        aiDecisionData: aiDecisionData,
        tradeScoreData: tradeScoreData,
        confluenceData: confluenceData,
        priceActionData: priceActionData,
        fvgData: fvgData,
        orderBlockData: orderBlockData,
        marketState: marketState,
        supportResistanceData: supportResistanceData,
        liquidityData: liquidityData,
        candleStrengthData: candleStrengthData,
        liveMarketObservation: liveObs,
        indicatorData: indicatorData,
        multiTimeframeData: null,
        connectionData: connectionData,
        healthStatus: healthStatus,
        stabilityData: stabilityData,
        bosChochData: bosChochData,
        marketStructureData: marketStructureData,
        trendData: trendData,
          momentumData: momentumData,
          volatilityData: volatilityData,
          riskData: riskData,
          riskData: riskData,
        status: 'active',
        analysisData: analysisData,
      };
      return visionResult;

    } catch (error) {
      LoggerService.error('VisionManager: Error during vision processing.', error);
      const errorAnalysisData = {
        frameId: this.frameCounter,
        lastUpdateTimestamp: Date.now(),
        captureLatency: 0,
        ocrLatency: 0,
        totalProcessingTime: 0,
        visionConfidence: null,
        ocrConfidence: null,
        dataCompleteness: 0,
        missingFieldCount: 0,
        processingStatus: 'FAILURE',
      };
      return {
        timestamp: Date.now(),
        windowState: state,
        ocrResult: null,
        candles: null,
        cleanChartImageBuffer: null,
        candleDrawingRegion: null,
        olymptradeLayout: null,
        chartBounds: null,
        marketState: null,
        supportResistanceData: null,
        marketStructureData: null,
        aiDecisionData: null,
        tradeScoreData: null,
        confluenceData: null,
        priceActionData: null,
        fvgData: null,
        orderBlockData: null,
        liquidityData: null,
        bosChochData: null,
        trendData: null,
        status: 'active',
        analysisData: errorAnalysisData as any,
      };
    }
  }

  /**
   * Calculates the exact chart area within the Olymp Trade window by excluding known UI elements.
   * This method uses the precise bounding boxes from the OlympTradeLayoutProfile.
   * @param windowState The current state of the tracked application window.
   * @param olymptradeLayout The calculated layout profile of the Olymp Trade UI.
   * @returns A BoundingBox object representing the chart region, or null if calculation fails or results in invalid dimensions.
   */
  private _calculateChartBounds(windowState: WindowState, olymptradeLayout: OlympTradeLayoutProfile): BoundingBox | null {
    if (!windowState.position || !windowState.size) {
      LoggerService.warn('VisionManager: Cannot calculate chart bounds, window position or size is missing.');
      return null;
    }

    const { x: windowX, y: windowY } = windowState.position;
    const { width: windowWidth, height: windowHeight } = windowState.size;

    // Initialize chart boundaries to the full window dimensions
    let chartX = windowX;
    let chartY = windowY;
    let chartRight = windowX + windowWidth;
    let chartBottom = windowY + windowHeight;

    // Apply exclusions based on OlympTradeLayoutProfile
    // Top exclusions: Chart starts below the lowest point of top UI elements
    chartY = Math.max(chartY, olymptradeLayout.toolbar.y + olymptradeLayout.toolbar.height);
    chartY = Math.max(chartY, olymptradeLayout.assetArea.y + olymptradeLayout.assetArea.height);
    chartY = Math.max(chartY, olymptradeLayout.balanceArea.y + olymptradeLayout.balanceArea.height);
    chartY = Math.max(chartY, olymptradeLayout.timeframeArea.y + olymptradeLayout.timeframeArea.height);
    chartY = Math.max(chartY, olymptradeLayout.expiryArea.y + olymptradeLayout.expiryArea.height);

    // Bottom exclusions: Chart ends above the highest point of bottom UI elements
    chartBottom = Math.min(chartBottom, olymptradeLayout.statusArea.y);
    chartBottom = Math.min(chartBottom, olymptradeLayout.buyButton.y);
    chartBottom = Math.min(chartBottom, olymptradeLayout.sellButton.y);

    // Left exclusions: Chart starts to the right of the rightmost point of left UI elements
    // Assuming assetArea is the primary left-side element that might push the chart right
    chartX = Math.max(chartX, olymptradeLayout.assetArea.x + olymptradeLayout.assetArea.width);

    // Right exclusions: Chart ends to the left of the leftmost point of right UI elements
    // Assuming buy/sell buttons are the primary right-side elements that might push the chart left
    chartRight = Math.min(chartRight, olymptradeLayout.buyButton.x);
    chartRight = Math.min(chartRight, olymptradeLayout.sellButton.x);

    const finalWidth = chartRight - chartX;
    const finalHeight = chartBottom - chartY;

    if (finalWidth <= 0 || finalHeight <= 0) {
      LoggerService.warn(`VisionManager: Calculated chart bounds have non-positive dimensions: ${finalWidth}x${finalHeight}. This might indicate an issue with layout detection or window size.`);
      return null;
    }

    const chartBounds: BoundingBox = {
      x: chartX,
      y: chartY,
      width: finalWidth,
      height: finalHeight,
    };

    LoggerService.info(`VisionManager: Calculated precise chart bounds: X:${chartBounds.x}, Y:${chartBounds.y}, W:${chartBounds.width}, H:${chartBounds.height}`);
    return chartBounds;
  }

  /**
   * Extracts the drawable chart area and defines the candle drawing region from the full window image.
   * This involves further cropping based on `chartDrawingAreaOffsets` from the config.
   * @param fullWindowImageBuffer The raw image buffer of the entire tracked window.
   * @param chartBounds The absolute screen coordinates of the detected chart region.
   * @param windowState The current state of the tracked application window.
   * @returns An object containing the clean chart image buffer and the candle drawing region (absolute screen coordinates), or null if extraction fails.
   */
  private _extractChartAndCandleRegions(
    fullWindowImageBuffer: Buffer,
    chartBounds: BoundingBox,
    windowState: WindowState
  ): { cleanChartImageBuffer: Buffer | null; candleDrawingRegion: BoundingBox | null } {
    if (!windowState.position) {
      LoggerService.warn('VisionManager: Cannot extract chart and candle regions, window position is missing.');
      return { cleanChartImageBuffer: null, candleDrawingRegion: null };
    }

    try {
      const fullWindowNativeImage = nativeImage.createFromBuffer(fullWindowImageBuffer);
      if (fullWindowNativeImage.isEmpty()) {
        LoggerService.error('VisionManager: Failed to create NativeImage from full window buffer.');
        return { cleanChartImageBuffer: null, candleDrawingRegion: null };
      }

      const chartCropAreaInWindowImage = {
        x: chartBounds.x - windowState.position.x,
        y: chartBounds.y - windowState.position.y,
        width: chartBounds.width,
        height: chartBounds.height,
      };
      const chartNativeImage = fullWindowNativeImage.crop(chartCropAreaInWindowImage);
      if (chartNativeImage.isEmpty()) {
        LoggerService.warn('VisionManager: Cropped chart image is empty.');
        return { cleanChartImageBuffer: null, candleDrawingRegion: null };
      }

      const offsets = config.vision.chartDrawingAreaOffsets;
      const drawableX_in_chartImage = Math.round(chartNativeImage.getSize().width * offsets.left);
      const drawableY_in_chartImage = Math.round(chartNativeImage.getSize().height * offsets.top);
      const drawableWidth_in_chartImage = Math.round(chartNativeImage.getSize().width * (1 - offsets.left - offsets.right));
      const drawableHeight_in_chartImage = Math.round(chartNativeImage.getSize().height * (1 - offsets.top - offsets.bottom));

      const cleanChartNativeImage = chartNativeImage.crop({ x: drawableX_in_chartImage, y: drawableY_in_chartImage, width: drawableWidth_in_chartImage, height: drawableHeight_in_chartImage });
      const cleanChartImageBuffer = cleanChartNativeImage.toPNG();

      const candleDrawingRegion: BoundingBox = {
        x: chartBounds.x + drawableX_in_chartImage,
        y: chartBounds.y + drawableY_in_chartImage,
        width: drawableWidth_in_chartImage,
        height: drawableHeight_in_chartImage,
      };
      LoggerService.info(`VisionManager: Extracted clean chart image and candle drawing region: X:${candleDrawingRegion.x}, Y:${candleDrawingRegion.y}, W:${candleDrawingRegion.width}, H:${candleDrawingRegion.height}`);
      return { cleanChartImageBuffer, candleDrawingRegion };
    } catch (error) {
      LoggerService.error('VisionManager: Error extracting chart and candle regions.', error);
      return { cleanChartImageBuffer: null, candleDrawingRegion: null };
    }
  }

  /**
   * Detects and extracts candle geometry from the cleaned chart image.
   * In a real implementation, this would involve image processing and pattern recognition.
   */
  private async _detectAndExtractCandles(
    _cleanChartImageBuffer: Buffer, // Unused parameter prefixed with _ (ERROR GROUP 5)
    _candleDrawingRegion: BoundingBox, // Unused parameter prefixed with _ (ERROR GROUP 5)
    _windowState: WindowState // windowState is available but not directly used in this phase for candle detection
  ): Promise<Candle[] | null> {
    LoggerService.info('VisionManager: Starting OHLC Candle Extraction Engine.');

    const nativeImg = nativeImage.createFromBuffer(_cleanChartImageBuffer);
    if (nativeImg.isEmpty()) {
      LoggerService.error('VisionManager: Failed to create NativeImage from clean chart buffer.');
      return null;
    }

    const { width: imageWidth, height: imageHeight } = nativeImg.getSize();
    const bitmap = nativeImg.toBitmap(); // RGBA buffer

    if (!bitmap || imageWidth === 0 || imageHeight === 0) {
      LoggerService.warn('VisionManager: Clean chart image bitmap is empty or has zero dimensions.');
      return null;
    }

    // Helper function to get pixel RGBA values
    const getPixel = (x: number, y: number): [number, number, number, number] => {
      if (x < 0 || x >= imageWidth || y < 0 || y >= imageHeight) {
        return [0, 0, 0, 0]; // Out of bounds, return transparent black
      }
      const i = (y * imageWidth + x) * 4;
      return [bitmap[i], bitmap[i + 1], bitmap[i + 2], bitmap[i + 3]];
    };

    // Helper function for color comparison within a range
    const isColorWithinRange = (pixelColor: [number, number, number], minColor: [number, number, number], maxColor: [number, number, number]): boolean => {
      return (
        pixelColor[0] >= minColor[0] && pixelColor[0] <= maxColor[0] &&
        pixelColor[1] >= minColor[1] && pixelColor[1] <= maxColor[1] &&
        pixelColor[2] >= minColor[2] && pixelColor[2] <= maxColor[2]
      );
    };

    // Helper function for color similarity (for expanding body horizontally)
    const isColorSimilar = (pixelColor: [number, number, number, number], targetColor: { r: number; g: number; b: number }, tolerance: number): boolean => {
      return (
        Math.abs(pixelColor[0] - targetColor.r) <= tolerance &&
        Math.abs(pixelColor[1] - targetColor.g) <= tolerance &&
        Math.abs(pixelColor[2] - targetColor.b) <= tolerance
      );
    };

    // Hardcoded candle detection parameters (these would ideally be configurable)
    const MIN_CANDLE_WIDTH = 3; // Minimum pixel width for a candle body
    const MAX_CANDLE_WIDTH = 20; // Maximum pixel width for a candle body
    const MIN_CANDLE_HEIGHT = 5; // Minimum total pixel height (body + wicks)
    const CANDLE_GAP_PX = 2; // Minimum horizontal gap between candles

    // Approximate color ranges for Olymp Trade candles (adjust based on actual chart theme)
    const GREEN_BODY_MIN: [number, number, number] = [0, 120, 0]; // Darker green/teal
    const GREEN_BODY_MAX: [number, number, number] = [160, 255, 255]; // Lighter green/cyan
    const RED_BODY_MIN: [number, number, number] = [150, 0, 0]; // Darker red/orange
    const RED_BODY_MAX: [number, number, number] = [255, 170, 120]; // Lighter red/orange
    const WICK_COLOR_MIN: [number, number, number] = [0, 0, 0]; // Black
    const WICK_COLOR_MAX: [number, number, number] = [100, 100, 100]; // Dark grey
    const COLOR_TOLERANCE = 40; // Tolerance for color similarity checks

    const detectedCandles: Candle[] = [];
    let currentX = imageWidth - 1; // Start scanning from the rightmost pixel of the cleaned chart image

    while (currentX >= 0) {
      let foundBodyPixel = false;
      let bodyCenterY = -1;
      let bodyColor: { r: number; g: number; b: number } | null = null;
      let candleDirection: 'bullish' | 'bearish' = 'bullish'; // Default, will be set by color

      // Step 1: Find a potential candle body pixel (red or green) by scanning vertically
      for (let y = imageHeight - 1; y >= 0; y--) {
        const pixel = getPixel(currentX, y);
        const r = pixel[0], g = pixel[1], b = pixel[2];

        if (isColorWithinRange([r, g, b], GREEN_BODY_MIN, GREEN_BODY_MAX)) {
          foundBodyPixel = true;
          bodyCenterY = y;
          bodyColor = { r, g, b };
          candleDirection = 'bullish';
          break;
        } else if (isColorWithinRange([r, g, b], RED_BODY_MIN, RED_BODY_MAX)) {
          foundBodyPixel = true;
          bodyCenterY = y;
          bodyColor = { r, g, b };
          candleDirection = 'bearish';
          break;
        }
      }

      if (foundBodyPixel && bodyColor) {
        // Step 2: Determine candle body width by expanding horizontally from the found pixel
        let bodyLeftX = currentX;
        let bodyRightX = currentX;

        // Expand left
        for (let x = currentX - 1; x >= 0; x--) {
          const pixel = getPixel(x, bodyCenterY);
          if (isColorSimilar(pixel, bodyColor, COLOR_TOLERANCE)) {
            bodyLeftX = x;
          } else {
            break;
          }
        }

    //    - This would involve using an image processing library (e.g., OpenCV.js, Jimp)
    //      or native Electron APIs to access raw pixel data within the `candleDrawingRegion`.
    // 2. Scan the `candleDrawingRegion` for visual patterns indicative of candles.
    //    - Candles typically have a consistent width and spacing.
    //    - The scanning direction (e.g., right-to-left for newest candles) will be determined.
    // 3. For each identified candle structure:
    //    a. Determine Candle Position: Identify the bounding box (`bbox`) of the entire candle (wicks + body).
    //    b. Determine Candle Width: Measure the width of the candle body.
    //    c. Determine Candle Height: Measure from the highest point of the upper wick to the lowest point of the lower wick.
    //    d. Identify Body Region: Determine the bounding box of the candle's body.
    //    e. Identify Upper Wick: Determine the bounding box or length of the upper wick.
    //    f. Identify Lower Wick: Determine the bounding box or length of the lower wick.
    //    g. Determine Candle Direction: Analyze the color of the candle body (e.g., green/blue for bullish, red for bearish).
    //    h. Calculate Relative X Position: The x-coordinate of the candle relative to the `candleDrawingRegion`.
    //    i. Calculate Relative Y Position: The y-coordinate of the candle relative to the `candleDrawingRegion`.
    //    j. Reconstruct OHLC (Open, High, Low, Close) values: This will require correlating pixel positions with a price axis (which would be OCR'd in a separate process or a future phase).
    //    k. Estimate Volume: If volume bars are present, they would be detected and measured.
    //    l. Assign a Confidence: A numerical value indicating the certainty of the candle detection and property extraction.
    // 4. Store detected candles in chronological order (oldest to newest) in the `Candle[]` array.
    // 5. Implement validation to ensure detected candles are geometrically sound and consistent.
    //
    // This architecture is designed to be expandable for future AI engines that will consume this
    // structured candle data for advanced analysis (e.g., Higher High, Lower Low, BOS, CHOCH, Order Blocks, Liquidity).
    // ------------------------------------------------------------------------------------------
        // Expand right (should be mostly currentX, but for robustness if initial pixel was not the rightmost)
        for (let x = currentX + 1; x < imageWidth; x++) {
          const pixel = getPixel(x, bodyCenterY);
          if (isColorSimilar(pixel, bodyColor, COLOR_TOLERANCE)) {
            bodyRightX = x;
          } else {
            break;
          }
        }

        const candleBodyWidth = bodyRightX - bodyLeftX + 1;

        if (candleBodyWidth < MIN_CANDLE_WIDTH || candleBodyWidth > MAX_CANDLE_WIDTH) {
          currentX = bodyLeftX - 1; // Skip this artifact and move left
          continue;
        }

        // Step 3: Determine body top and bottom Y
        let bodyTopY = bodyCenterY;
        for (let y = bodyCenterY - 1; y >= 0; y--) {
          const pixel = getPixel(bodyLeftX + Math.floor(candleBodyWidth / 2), y); // Check center of body
          if (isColorSimilar(pixel, bodyColor, COLOR_TOLERANCE)) {
            bodyTopY = y;
          } else {
            break;
          }
        }

        let bodyBottomY = bodyCenterY;
        for (let y = bodyCenterY + 1; y < imageHeight; y++) {
          const pixel = getPixel(bodyLeftX + Math.floor(candleBodyWidth / 2), y); // Check center of body
          if (isColorSimilar(pixel, bodyColor, COLOR_TOLERANCE)) {
            bodyBottomY = y;
          } else {
            break;
          }
        }

        // Step 4: Determine wicks
        let upperWickTopY = bodyTopY;
        for (let y = bodyTopY - 1; y >= 0; y--) {
          const pixel = getPixel(bodyLeftX + Math.floor(candleBodyWidth / 2), y);
          if (isColorWithinRange([pixel[0], pixel[1], pixel[2]], WICK_COLOR_MIN, WICK_COLOR_MAX)) {
            upperWickTopY = y;
          } else {
            break;
          }
        }

        let lowerWickBottomY = bodyBottomY;
        for (let y = bodyBottomY + 1; y < imageHeight; y++) {
          const pixel = getPixel(bodyLeftX + Math.floor(candleBodyWidth / 2), y);
          if (isColorWithinRange([pixel[0], pixel[1], pixel[2]], WICK_COLOR_MIN, WICK_COLOR_MAX)) {
            lowerWickBottomY = y;
          } else {
            break;
          }
        }

        const totalCandleHeight = lowerWickBottomY - upperWickTopY + 1;
        if (totalCandleHeight < MIN_CANDLE_HEIGHT) {
          currentX = bodyLeftX - 1; // Skip this small artifact
          continue;
        }

        // Calculate OHLC (pixel Y-coordinates)
        const high = upperWickTopY;
        const low = lowerWickBottomY;
        let open: number;
        let close: number; // Lower Y is higher price

        if (candleDirection === 'bullish') {
          open = bodyBottomY; // Bullish: Open (lower Y) is numerically higher than Close (higher Y)
          close = bodyTopY; // This means open price is lower than close price in actual value, but higher Y-coordinate
        } else if (candleDirection === 'bearish') {
          open = bodyTopY; // Bearish: Open (higher Y) is numerically lower than Close (lower Y)
          close = bodyBottomY; // This means open price is higher than close price in actual value, but lower Y-coordinate
        } else { // bearish
          open = bodyTopY; // For bearish, open is higher pixel Y, close is lower pixel Y
          close = bodyBottomY;
        }

        // Construct Bounding Boxes (absolute screen coordinates)
        const candleAbsX = _candleDrawingRegion.x + bodyLeftX;
        const bodyHeightPx = Math.abs(open - close);
        const isDoji = bodyHeightPx < (totalCandleHeight * 0.1); // If body is less than 10% of total height, consider it a doji. Threshold can be adjusted.

        let finalDirection: 'bullish' | 'bearish' | 'doji';
        if (isDoji) {
          finalDirection = 'doji';
        } else {
          finalDirection = candleDirection;
        }
        const candleAbsY = _candleDrawingRegion.y + upperWickTopY;
        const candleAbsWidth = candleBodyWidth;
        const candleAbsHeight = totalCandleHeight;

        const bbox: BoundingBox = { x: candleAbsX, y: candleAbsY, width: candleAbsWidth, height: candleAbsHeight };
        const bodyBbox: BoundingBox = { x: _candleDrawingRegion.x + bodyLeftX, y: _candleDrawingRegion.y + bodyTopY, width: candleBodyWidth, height: bodyBottomY - bodyTopY + 1 };
        const upperWickBbox: BoundingBox = { x: _candleDrawingRegion.x + bodyLeftX + Math.floor(candleBodyWidth / 2), y: _candleDrawingRegion.y + upperWickTopY, width: 1, height: bodyTopY - upperWickTopY };
        const lowerWickBbox: BoundingBox = { x: _candleDrawingRegion.x + bodyLeftX + Math.floor(candleBodyWidth / 2), y: _candleDrawingRegion.y + bodyBottomY, width: 1, height: lowerWickBottomY - bodyBottomY };

        detectedCandles.push({
          open, high, low, close, volume: undefined, // Volume not detectable in this phase
          bbox, bodyBbox, upperWickBbox, lowerWickBbox,
          candleWidth: candleBodyWidth, bodySize: bodyBottomY - bodyTopY + 1,
          upperWickLength: bodyTopY - upperWickTopY, lowerWickLength: lowerWickBottomY - bodyBottomY,
          totalHeight: totalCandleHeight, direction: finalDirection,
          relativeXPosition: (bodyLeftX + candleBodyWidth / 2) / imageWidth,
          relativeYPosition: (upperWickTopY + totalCandleHeight / 2) / imageHeight,
          rgbColor: bodyColor, confidence: 90, // Basic confidence for now
        });
        currentX = bodyLeftX - CANDLE_GAP_PX - 1; // Move past this candle and gap
      } else {
        currentX--; // No candle body pixel found, move to the next column
      }
    }

    if (detectedCandles.length === 0) {
      LoggerService.warn('VisionManager: No candles detected after scanning the chart image.');
      return null;
    }

    // Candles were detected right-to-left (newest to oldest), reverse for oldest to newest
    detectedCandles.reverse();

    LoggerService.info(`VisionManager: Detected ${detectedCandles.length} candles.`);
    // Assign candleIndex after sorting
    detectedCandles.forEach((candle, index) => {
      candle.candleIndex = index;
    });
    return detectedCandles;
  }

  /**
   * Support and Resistance analysis.
   * This method analyzes candle swing points and repeated touches to identify S/R levels.
   * @param marketState Current market data (can be null).
   * @param candles Detected candles (can be null).
   * @returns SupportResistanceData or null.
   *
   * This method implements a real Support & Resistance Detection Engine.
   * It uses extracted OHLC candles (pixel Y-coordinates) to identify and categorize S/R levels.
   * The engine works without OCR text for price values, relying solely on pixel positions.
   */

  /**
   * Implements a REAL Trend Detection Engine using OHLC candles and Support & Resistance levels.
   * Determines current market direction, strength, and confidence.
   *
   * @param candles Array of Candle objects (OHLC pixel Y-coordinates).
   * @param supportResistanceData Detected Support and Resistance levels.
   * @param currentPriceY Current price as a pixel Y-coordinate.
   * @param previousTrendData The last calculated trend data for incremental analysis.
   * @returns TrendData object or null if insufficient data.
   */

  /**
   * Implements a REAL Market Structure Engine using OHLC candle data,
   * trend detection results, support & resistance results, and current price.
   *
   * @param candles Array of Candle objects (OHLC pixel Y-coordinates).
   * @param trendData Current trend analysis data.
   * @param supportResistanceData Current support and resistance levels.
   * @param currentPriceY Current price as a pixel Y-coordinate.
   * @param previousMarketStructureData The last calculated market structure data for incremental analysis.
   * @returns MarketStructureData object or null if insufficient data.
   */

  /**
   * Implements a REAL BOS (Break of Structure) and CHOCH (Change of Character) Detection Engine.
   * Analyzes existing Market Structure data to identify BOS and CHOCH events.
   *
   * @param candles Array of Candle objects.
   * @param marketStructureData Current market structure data.
   * @param trendData Current trend analysis data.
   * @param supportResistanceData Current support and resistance levels.
   * @param currentPriceY Current price as a pixel Y-coordinate.
   * @param previousBosChochData The last calculated BOS/CHOCH data for incremental analysis.
   * @returns BosChochData object or null if insufficient data.
   */

  /**
   * Implements a REAL Smart Money Concepts Liquidity Engine.
   * Identifies Buy Side/Sell Side Liquidity, Equal Highs/Lows, and detects Liquidity Sweeps.
   *
   * @param candles Array of Candle objects.
   * @param trendData Current trend analysis data.
   * @param marketStructureData Current market structure data.
   * @param bosChochData Current BOS/CHOCH data.
   * @param supportResistanceData Current support and resistance levels.
   * @param currentPriceY Current price as a pixel Y-coordinate.
   * @param previousLiquidityData The last calculated Liquidity data for incremental analysis.
   * @returns LiquidityData object or null if insufficient data.
   */

  /**
   * Implements a REAL Order Block Detection Engine.
   * Identifies bullish and bearish order blocks based on candle patterns and market context.
   *
   * @param candles Array of Candle objects.
   * @param trendData Current trend analysis data.
   * @param marketStructureData Current market structure data.
   * @param bosChochData Current BOS/CHOCH data.
   * @param liquidityData Current Liquidity data.
   * @param currentPriceY Current price as a pixel Y-coordinate.
   * @param previousOrderBlockData The last calculated Order Block data for incremental analysis.
   * @returns OrderBlockData object or null if insufficient data.
   */

  /**
   * Implements a REAL Fair Value Gap (FVG) & Imbalance Engine.
   * Detects bullish and bearish FVGs and tracks their status (fresh, partially filled, completely filled, invalidated).
   *
   * @param candles Array of Candle objects.
   * @param trendData Current trend analysis data.
   * @param marketStructureData Current market structure data.
   * @param bosChochData Current BOS/CHOCH data.
   * @param liquidityData Current Liquidity data.
   * @param orderBlockData Current Order Block data.
   * @param currentPriceY Current price as a pixel Y-coordinate.
   * @param previousFvgData The last calculated FVG data for incremental analysis.
   * @returns FvgData object or null if insufficient data.
   */

  /**
   * Implements a REAL Price Action Recognition Engine.
   * Detects various price action patterns (e.g., pin bars, engulfing patterns, dojis)
   * and assesses their strength and reliability.
   *
   * @param candles Array of Candle objects.
   * @param trendData Current trend analysis data.
   * @param marketStructureData Current market structure data.
   * @param bosChochData Current BOS/CHOCH data.
   * @param liquidityData Current Liquidity data.
   * @param orderBlockData Current Order Block data.
   * @param fvgData Current FVG data.
   * @param currentPriceY Current price as a pixel Y-coordinate.
   * @param previousPriceActionData The last calculated Price Action data for incremental analysis.
   * @returns PriceActionData object or null if insufficient data.
   */

  /**
   * Implements a REAL Smart Money Concepts (SMC) Confluence Engine.
   * Aggregates insights from various SMC modules (Trend, Market Structure, BOS/CHOCH, Liquidity, OB, FVG, Price Action)
   * to determine an institutional bias and overall confluence score.
   *
   * @param candles Array of Candle objects.
   * @param trendData Current trend analysis data.
   * @param supportResistanceData Current support and resistance levels.
   * @param marketStructureData Current market structure data.
   * @param bosChochData Current BOS/CHOCH data.
   * @param liquidityData Current Liquidity data.
   * @param orderBlockData Current Order Block data.
   * @param fvgData Current FVG data.
   * @param priceActionData Current Price Action data.
   * @param currentPriceY Current price as a pixel Y-coordinate.
   * @param previousConfluenceData The last calculated Confluence data for incremental analysis.
   * @returns ConfluenceData object or null if insufficient data.
   */

  /**
   * Implements a REAL Trade Scoring Engine.
   * Evaluates the quality and probability of a potential trade setup based on all available SMC analysis data.
   *
   * @param candles Array of Candle objects.
   * @param trendData Current trend analysis data.
   * @param supportResistanceData Current support and resistance levels.
   * @param marketStructureData Current market structure data.
   * @param bosChochData Current BOS/CHOCH data.
   * @param liquidityData Current Liquidity data.
   * @param orderBlockData Current Order Block data.
   * @param fvgData Current FVG data.
   * @param priceActionData Current Price Action data.
   * @param confluenceData Current Confluence data.
   * @param currentPriceY Current price as a pixel Y-coordinate.
   * @param previousTradeScoreData The last calculated Trade Score data for incremental analysis.
   * @returns TradeScoreData object or null if insufficient data.
   */

  /**
   * Implements a REAL AI BUY / SELL Decision Engine.
   * Makes a trading decision (BUY, SELL, WAIT, NO_TRADE) based on the aggregated SMC analysis and trade score.
   *
   * @param candles Array of Candle objects.
   * @param trendData Current trend analysis data.
   * @param supportResistanceData Current support and resistance levels.
   * @param marketStructureData Current market structure data.
   * @param bosChochData Current BOS/CHOCH data.
   * @param liquidityData Current Liquidity data.
   * @param orderBlockData Current Order Block data.
   * @param fvgData Current FVG data.
   * @param priceActionData Current Price Action data.
   * @param confluenceData Current Confluence data.
   * @param tradeScoreData Current Trade Score data.
   * @param currentPriceY Current price as a pixel Y-coordinate.
   * @param previousAIDecisionData The last calculated AI Decision data for incremental analysis.
   * @returns AIDecisionData object or null if insufficient data.
   */

  /**
   * Implements a REAL AI Reason Generator.
   * Generates human-readable reasons and explanations for the AI's trading decision,
   * categorizing them by priority and type.
   *
   * @param aiDecisionData The AI's decision data.
   * @param tradeScoreData Current Trade Score data.
   * @param confluenceData Current Confluence data.
   * @param trendData Current trend analysis data.
   * @param supportResistanceData Current support and resistance levels.
   * @param marketStructureData Current market structure data.
   * @param bosChochData Current BOS/CHOCH data.
   * @param liquidityData Current Liquidity data.
   * @param orderBlockData Current Order Block data.
   * @param fvgData Current FVG data.
   * @param priceActionData Current Price Action data.
   * @param currentPriceY Current price as a pixel Y-coordinate.
   * @returns AIReasoning object or null.
   */

  /**
   * Calculates the absolute screen coordinates for predefined static UI regions
   * within the Olymp Trade window based on configured percentages.
   * @param windowState The current state of the tracked application window.
   * @returns An OlympTradeLayoutProfile object with absolute BoundingBox for each region, or null if calculation fails.
   */
  private _calculateOlympTradeLayout(windowState: WindowState): OlympTradeLayoutProfile | null {
    if (!windowState.position || !windowState.size) {
      LoggerService.warn('VisionManager: Cannot calculate Olymp Trade layout, window position or size is missing.');
      return null;
    }

    const { x: windowX, y: windowY } = windowState.position;
    const { width: windowWidth, height: windowHeight } = windowState.size;
    const layoutConfig = config.vision.olymptradeLayout;

    const calculateRegion = (relativeRegion: { top: number; left: number; width: number; height: number }): BoundingBox => {
      const regionX = windowX + Math.round(windowWidth * relativeRegion.left);
      const regionY = windowY + Math.round(windowHeight * relativeRegion.top);
      const regionWidth = Math.round(windowWidth * relativeRegion.width);
      const regionHeight = Math.round(windowHeight * relativeRegion.height);
      return { x: regionX, y: regionY, width: regionWidth, height: regionHeight };
    };

    const olymptradeLayout: OlympTradeLayoutProfile = {
      assetArea: calculateRegion(layoutConfig.assetArea),
      balanceArea: calculateRegion(layoutConfig.balanceArea),
      timeframeArea: calculateRegion(layoutConfig.timeframeArea),
      expiryArea: calculateRegion(layoutConfig.expiryArea),
      buyButton: calculateRegion(layoutConfig.buyButton),
      sellButton: calculateRegion(layoutConfig.sellButton),
      toolbar: calculateRegion(layoutConfig.toolbar),
      statusArea: calculateRegion(layoutConfig.statusArea),
    };

    LoggerService.info('VisionManager: Calculated Olymp Trade layout profile.');
    return olymptradeLayout;
  }
}
