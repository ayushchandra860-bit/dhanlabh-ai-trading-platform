export const config = {
  windowTracking: {
    // The interval, in milliseconds, to poll for the active window state.
    pollRateMs: 1000,
  },
  vision: {
    // The interval, in milliseconds, to capture the screen and perform analysis.
    captureIntervalMs: 5000,
    ocrLanguage: 'eng', // Language for Tesseract OCR
    // Percentage offsets for detecting the chart region within the main window.
    // These values represent the proportion of the window's total dimension to crop from each side.
    chartRegionOffsets: {
      top: 0.10,    // 10% from the top (e.g., for toolbars)
      bottom: 0.15, // 15% from the bottom (e.g., for trading controls/footer)
      left: 0.05,   // 5% from the left (e.g., for asset selection sidebar)
      right: 0.05,  // 5% from the right (e.g., for trade panel or scrollbar)
    },
    // Percentage offsets within the detected chart region to define the actual drawable chart area
    chartDrawingAreaOffsets: {
      top: 0.05,    // 5% from the top of the chart region (e.g., for chart title/indicators)
      bottom: 0.08, // 8% from the bottom of the chart region (e.g., for time axis labels)
      left: 0.03,   // 3% from the left of the chart region (e.g., for price axis labels)
      right: 0.07,  // 7% from the right of the chart region (e.g., for current price label)
    },
    // Relative percentage-based coordinates for static UI regions within the Olymp Trade window.
    // These are used to define areas for specific OCR or interaction targets.
    olymptradeLayout: {
      // Example values, these would need to be fine-tuned based on actual UI analysis
      assetArea: { top: 0.02, left: 0.15, width: 0.10, height: 0.05 }, // Top-left area for asset name
      balanceArea: { top: 0.02, left: 0.70, width: 0.10, height: 0.05 }, // Top-right area for balance
      timeframeArea: { top: 0.02, left: 0.30, width: 0.08, height: 0.05 }, // Area for selected timeframe
      expiryArea: { top: 0.02, left: 0.40, width: 0.08, height: 0.05 }, // Area for trade expiry time
      buyButton: { top: 0.80, left: 0.75, width: 0.10, height: 0.07 }, // Buy button region
      sellButton: { top: 0.80, left: 0.65, width: 0.10, height: 0.07 }, // Sell button region
      toolbar: { top: 0.00, left: 0.00, width: 1.00, height: 0.08 }, // Entire top toolbar area
      statusArea: { top: 0.95, left: 0.00, width: 1.00, height: 0.05 }, // Entire bottom status bar area
      // Add more regions as identified in the UI design
      // e.g., { top: 0.10, left: 0.05, width: 0.10, height: 0.05 } 
      // e.g., { top: 0.10, left: 0.05, width: 0.10, height: 0.05 }
    },
    minCandlesForStructureAnalysis: 5, // Minimum number of candles required to attempt market structure analysis
    minCandlesForMarketStructure: 10, // Minimum number of candles required for market structure detection
    minCandlesForTrendDetection: 10, // Minimum number of candles required for trend detection
    minCandlesForPriceAction: 5, // Minimum number of candles required for price action pattern detection
    minCandlesForFvgDetection: 3, // Minimum number of candles required for FVG detection (3-candle pattern)
    minFvgSizePx: 2, // Minimum pixel size for an FVG to be considered valid
    fvgFillTolerancePx: 1, // Pixel tolerance for price to be considered "filling" an FVG
    fvgInvalidationThresholdPx: 10, // Pixel distance beyond which an FVG is considered invalidated,
    minCandlesForConfluence: 15, // Minimum number of candles required for confluence analysis
    minCandlesForTradeScoring: 15, // Minimum number of candles required for trade scoring analysis
  },
  enabledModules: [
    'trend',
    'supportResistance',
    'liquidity',
    'fvg',
    'orderBlocks',
    'bos',
    'choch',
    'confluence',
    'tradeDecision',
  ],
  confidenceGuard: {
    minOcrConfidence: 40,
    minVisionConfidence: 60,
    minChartDetectionConfidence: 70,
  },
  confluenceWeights: {
    trend: 1.5,
    marketStructure: 1.8,
    bosChoch: 2.0,
    liquidity: 1.7,
    orderBlock: 1.9,
    fvg: 1.6,
    priceAction: 1.4,
    supportResistance: 1.2,
  },
  aiDecision: {
    minCandlesForAIDecision: 20, // Minimum number of candles required for AI to make a decision
    minTradeScoreForDecision: 70, // Minimum overall trade score to consider BUY/SELL
    minConfluenceScoreForDecision: 75, // Minimum confluence score to consider BUY/SELL
    minConfidenceForTrade: 60, // Minimum overall confidence for any trade (BUY/SELL/WAIT)
    maxRiskForTrade: 60, // Maximum risk score to consider BUY/SELL
    minConfidenceForStrongDecision: 80, // Confidence level for a strong decision (above moderate)
    minBosChochConfidence: 70, // Minimum confidence for BOS/CHOCH to be considered confirmed
    minLiquiditySweepConfidence: 70, // Minimum confidence for a liquidity sweep to be considered confirmed
    minObFvgConfidence: 65, // Minimum confidence for an OB/FVG to be considered valid and nearby
    minPriceActionConfidence: 70, // Minimum confidence for a price action pattern to be considered confirmed
    minTrendStrengthForDecision: 50, // Minimum trend strength to consider directional trades
    minLiquidityConfidenceForDecision: 60, // Minimum overall liquidity confidence for directional trades
    minConfluenceScoreDifferenceForBias: 10, // Minimum difference between bullish/bearish confluence scores to establish a clear bias
  },
};