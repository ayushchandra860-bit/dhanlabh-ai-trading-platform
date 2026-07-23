import sys

file_path = r'c:\Users\ayush\Documents\Dhanlabh V2\electron\main\VisionManager.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """        }) as Array<keyof MarketState>;
   * @param windowState The current state of the tracked application window."""

replacement = """        }) as Array<keyof MarketState>;

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
          decision: 'UNAVAILABLE',
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
        };
      } else {
        // 8. Support & Resistance Foundation
        if (isEnabled('supportResistance')) {
          supportResistanceData = this._analyzeSupportResistance(marketState, candles);
        }

        // 9. Trend Detection Engine
        if (isEnabled('trend')) {
          trendData = this._analyzeTrend(candles, supportResistanceData, marketState?.currentPrice ?? null, this._lastTrendData);
        }

        // 10. Market Structure Engine
        marketStructureData = this._analyzeMarketStructure(candles, trendData, supportResistanceData, marketState?.currentPrice ?? null, this._lastMarketStructureData);

        // 11. BOS + CHOCH Detection Engine
        if (isEnabled('bos') || isEnabled('choch')) {
          bosChochData = this._analyzeBosChoch(candles, marketStructureData, trendData, supportResistanceData, marketState?.currentPrice ?? null, this._lastBosChochData);
        }

        // 12. Liquidity & Liquidity Sweep Engine
        if (isEnabled('liquidity')) {
          liquidityData = this._analyzeLiquidityAndSweeps(candles, trendData, marketStructureData, bosChochData, supportResistanceData, marketState?.currentPrice ?? null, this._lastLiquidityData);
        }

        // 13. Order Block Detection Engine
        if (isEnabled('orderBlocks')) {
          orderBlockData = this._analyzeOrderBlocks(candles, trendData, marketStructureData, bosChochData, liquidityData, marketState?.currentPrice ?? null, this._lastOrderBlockData);
        }

        // 14. Fair Value Gap (FVG) & Imbalance Engine
        if (isEnabled('fvg')) {
          fvgData = this._analyzeFairValueGaps(candles, trendData, marketStructureData, bosChochData, liquidityData, orderBlockData, marketState?.currentPrice ?? null, this._lastFvgData);
        }

        // 15. Price Action Recognition Engine
        priceActionData = this._analyzePriceAction(candles, trendData, marketStructureData, bosChochData, liquidityData, orderBlockData, fvgData, marketState?.currentPrice ?? null, this._lastPriceActionData);

        // 16. Smart Money Concepts (SMC) Confluence Engine
        if (isEnabled('confluence')) {
          confluenceData = this._analyzeConfluence(candles, trendData, supportResistanceData, marketStructureData, bosChochData, liquidityData, orderBlockData, fvgData, priceActionData, marketState?.currentPrice ?? null, this._lastConfluenceData);
        }

        // 17. Trade Scoring Engine
        if (isEnabled('tradeDecision')) {
          tradeScoreData = this._analyzeTradeScore(candles, trendData, supportResistanceData, marketStructureData, bosChochData, liquidityData, orderBlockData, fvgData, priceActionData, confluenceData, marketState?.currentPrice ?? null, this._lastTradeScoreData);

          // 18. AI BUY / SELL Decision Engine
          aiDecisionData = this._makeAIDecision(candles, trendData, supportResistanceData, marketStructureData, bosChochData, liquidityData, orderBlockData, fvgData, priceActionData, confluenceData, tradeScoreData, marketState?.currentPrice ?? null, this._lastAIDecisionData);

          // 19. AI Reason Generator
          if (aiDecisionData) {
            const aiReasoning = this._generateAIReasons(aiDecisionData, tradeScoreData, confluenceData, trendData, supportResistanceData, marketStructureData, bosChochData, liquidityData, orderBlockData, fvgData, priceActionData, marketState?.currentPrice ?? null);
            aiDecisionData.reasoning = aiReasoning;
          }
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
        bosChochData: bosChochData,
        marketStructureData: marketStructureData,
        trendData: trendData,
        status: 'active',
        analysisData: analysisData,
      };
      return visionResult;

    } catch (error) {
      LoggerService.error('VisionManager: Error during vision processing.', error);
      const errorAnalysisData: AnalysisData = {
        frameId: this.frameCounter,
        lastUpdateTimestamp: now,
        captureLatency: captureLatency,
        ocrLatency: ocrLatency,
        totalProcessingTime: performance.now() - totalProcessingStartTime,
        visionConfidence: null,
        ocrConfidence: null,
        dataCompleteness: 0,
        missingFieldCount: MARKET_STATE_NULLABLE_FIELD_COUNT,
        processingStatus: 'FAILURE',
      };
      return {
        timestamp: now,
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
        analysisData: errorAnalysisData,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Calculates the exact chart area within the Olymp Trade window by excluding known UI elements.
   * This method uses the precise bounding boxes from the OlympTradeLayoutProfile.
   * @param windowState The current state of the tracked application window."""

content = content.replace(target, replacement)
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patch applied successfully')
