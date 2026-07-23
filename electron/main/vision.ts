import { OcrResult } from './ocr';
import { WindowState } from '../../shared/types/window';

// New interfaces for Order Block Engine
export type OrderBlockType = 'bullish' | 'bearish';

export type OrderBlockStatus = 'fresh' | 'tested' | 'mitigated' | 'invalidated';

export interface OrderBlock {
  blockType: OrderBlockType;
  direction: 'bullish' | 'bearish';
  originCandleIndex: number; // Index of the candle that formed the OB
  startPrice: number; // Top of bearish OB / Bottom of bullish OB
  endPrice: number; // Bottom of bearish OB / Top of bullish OB (pixel Y-coordinates)
  high: number; // Highest price of the OB zone
  low: number; // Lowest price of the OB zone
  midPrice: number; // Mid-point of the OB zone (pixel Y-coordinate)
  confirmationCandleIndex: number | null; // Index of the candle that confirmed the OB (e.g., strong move away)
  strength: number; // 0-100, based on volume, size, context
  confidence: number; // 0-100, confidence in the detection
  touchCount: number; // How many times the OB has been touched/tested
  mitigationCount: number; // How many times the OB has been mitigated (price entered and left)
  currentStatus: OrderBlockStatus;
  timestamp: number; // Timestamp of the origin candle's close
  distanceFromCurrentPrice: number; // Absolute pixel distance from current price
  mitigationProbability: number; // 0-100, likelihood of mitigation
  retestProbability: number; // 0-100, likelihood of retest
}

// New enums for AI Reason Generator
export enum ReasonCategory {
  AIDecision = 'AI Decision',
  TradeScore = 'Trade Score',
  SMCConfluence = 'SMC Confluence',
  Trend = 'Trend',
  SupportResistance = 'Support & Resistance',
  MarketStructure = 'Market Structure',
  BOSCHOCH = 'BOS / CHOCH',
  Liquidity = 'Liquidity',
  OrderBlocks = 'Order Blocks',
  FVG = 'Fair Value Gap',
  PriceAction = 'Price Action',
  RiskManagement = 'Risk Management',
  General = 'General',
}

export enum ReasonPriority {
  Primary = 'Primary',
  Secondary = 'Secondary',
  Supporting = 'Supporting',
  Rejecting = 'Rejecting',
}

export interface AIReason {
  id: string; // Unique ID for the reason
  decisionId: string; // ID of the AIDecisionData this reason belongs to
  priority: ReasonPriority;
  category: ReasonCategory;
  description: string;
  moduleSource: string; // The module that generated this reason
  evidence: string; // The measurable evidence for this reason
  confidence: number; // 0-100
  timestamp: number;
}

export interface OrderBlockData {
  nearestBullishOrderBlock: OrderBlock | null;
  nearestBearishOrderBlock: OrderBlock | null;
  activeOrderBlocks: OrderBlock[];
  mitigatedOrderBlocks: OrderBlock[];
  invalidatedOrderBlocks: OrderBlock[];
  orderBlockSummary: string; // Human-readable summary
  overallConfidence: number; // 0-100, overall confidence in OB detection
}

// New interface for the full AI Reasoning output
export interface AIReasoning {
  decisionSummary: string;
  positiveReasons: AIReason[]; // Replaces topReasons and supportingFactors
  negativeReasons: AIReason[]; // Replaces rejectingFactors
  riskExplanation: string;
  confidenceExplanation: string;
  institutionalSummary: string;
  retailWarning: string;
  marketSummary: string;
}

// New interfaces for AI BUY / SELL Decision Engine
export type AIDecisionType = 'BUY' | 'SELL' | 'WAIT' | 'NO SIGNAL' | 'ANALYZING' | 'LOW CONFIDENCE';


export interface ChecklistItem {
  label: string;
  ok: boolean;
}

export interface SignalHistoryItem {
  signal: AIDecisionType;
  confidence: number;
  tradeScore: number;
  timestamp: number;
  marketSnapshot: MarketState | null;
  outcome: string | null;
}

export interface AIDecisionData {
  trendEvidence?: number;
  momentumEvidence?: number;
  structureEvidence?: number;
  patternEvidence?: number;
  liquidityEvidence?: number;
  volumeEvidence?: number;
  posteriorProbability?: number;
  evidenceCount?: number;
  lastBayesianUpdate?: number;

  id: string; // Unique ID
  signal: AIDecisionType; // The final AI signal
  checklist: { label: string; ok: boolean }[]; // Enforced AI checklist
  isTradeAllowed: boolean; // Whether the trade is permitted
  confidence: number; // 0-100, confidence in the AI's decision
  tradeScore: number; // The overall trade score at the time of decision
  bullishPercentage: number; // Bullish score percentage from Trade Scoring
  bearishPercentage: number; // Bearish score percentage from Trade Scoring
  riskLevel: number; // 0-100, risk level from Trade Scoring
  timestamp: number; // Timestamp of the decision
  institutionalBias: InstitutionalBias; // Institutional bias from Confluence Engine
  expectedSuccessProbability: number; // 0-100, probability of the trade being successful
  entryQuality: number; // 0-100, quality of the potential entry point
  summary: string; // Human-readable summary of the decision
  reasoning: AIReasoning | null;
  unavailableReasons?: string[];
  recommendedExpiry: string; // Dynamic expiry based on trend
  entryRecommendation: 'YES' | 'NO' | 'WAIT'; // Strict entry suggestion
  nearestDanger: string; // Detected immediate danger
}



// New interfaces for Trade Scoring Engine
export type TradeQualityClassification = 'Very Weak' | 'Weak' | 'Average' | 'Strong' | 'High Probability Institutional Setup' | 'Undefined';


export interface RiskData {
  riskLevel: number; 
  lateEntryRisk: number; 
  breakoutRisk: number; 
  fakeoutRisk: number; 
  volatilityRisk: number; 
  confidence: number;
  explanation: string;
}

export interface TradeScoreData {
  id: string; // Unique ID
  overallScore: number; // 0-100
  bullishScore: number; // 0-100
  bearishScore: number; // 0-100
  neutralScore: number; // 0-100
  confidence: number; // 0-100, institutional confidence
  riskScore: number; // 0-100, higher means higher risk
  timestamp: number;
  tradeQuality: TradeQualityClassification;
  reasonSummary: string;

  recommendedExpiry: string | null;
  riskRewardRatio: number | null;
  expectedWinRate: number | null;
 // Human-readable summary of the score
  scoringFactors: {
    trendQuality: number; // Derived from trendData.currentTrend.strength
    marketStructureQuality: number; // Derived from marketStructureData.structureStrength
    bosConfirmation: number; // Derived from bosChochData.latestBOS.strength
    chochConfirmation: number; // Derived from bosChochData.latestCHOCH.strength
    liquidityPosition: number; // Derived from liquidityData.nearestBuySide/SellSideLiquidity.strength
    liquiditySweepQuality: number; // Derived from liquidityData.latestSweep.sweepStrength
    orderBlockQuality: number; // Derived from orderBlockData.nearestBullish/BearishOrderBlock.strength
    fvgQuality: number; // Derived from fvgData.nearestBullish/BearishFVG.strength
    priceActionStrength: number; // Derived from priceActionData.latestPattern.patternStrength
    smcConfluence: number; // Derived from confluenceData.confluenceScore
    supportDistance: number; // Derived from supportResistanceData.nearestSupport.distanceFromCurrentPrice
    resistanceDistance: number; // Derived from supportResistanceData.nearestResistance.distanceFromCurrentPrice
    riskContext: number; // Derived from confluenceData.retailTrapProbability, fake breakout risk
    momentum: number; // Derived from trendData.currentTrend.momentumScore
    volatility: number; // Derived from average candle size, total height
  };
  bullishPercentage: number; // 0-100
  bearishPercentage: number; // 0-100
  neutralPercentage: number; // 0-100
  retailTrapRisk: number; // 0-100
  fakeBreakoutRisk: number; // 0-100
  trendContinuationScore: number; // 0-100
  trendReversalScore: number; // 0-100
}


// New interfaces for Smart Money Concepts (SMC) Confluence Engine
export type InstitutionalBias = 'bullish' | 'bearish' | 'neutral' | 'undefined';

export interface ConfluenceFactor {
  module: string; // e.g., 'trend', 'marketStructure', 'liquidity'
  factor: string; // e.g., 'strong_uptrend', 'bullish_bos', 'nearest_bullish_ob'
  scoreContribution: number; // How much this factor contributed to the overall score
  confidence: number; // Confidence of this specific factor
  direction: 'bullish' | 'bearish' | 'neutral';
}

export interface ConfluenceData {
  id: string; // Unique ID for this confluence analysis
  institutionalBias: InstitutionalBias;
  bullishScore: number; // 0-100
  bearishScore: number; // 0-100
  neutralScore: number; // 0-100
  confluenceScore: number; // 0-100, overall alignment score
  confidence: number; // 0-100, confidence in the confluence analysis
  reasonSummary: string; // Human-readable summary of the confluence
  supportingFactors: ConfluenceFactor[];
  rejectingFactors: ConfluenceFactor[];
  timestamp: number; // Timestamp of the analysis
  retailTrapProbability: number; // 0-100
  reversalProbability: number; // 0-100
  continuationProbability: number; // 0-100
}

// New interfaces for Price Action Recognition Engine
export type PatternDirection = 'bullish' | 'bearish' | 'neutral'; // Neutral for Doji, Spinning Top if not clearly directional
export type PatternType =
  'bullish_pin_bar' | 'bearish_pin_bar' | 'hammer' | 'inverted_hammer' | 'shooting_star' |
  'doji' | 'long_legged_doji' | 'dragonfly_doji' | 'gravestone_doji' |
  'marubozu_bullish' | 'marubozu_bearish' | 'spinning_top' |
  'bullish_engulfing' | 'bearish_engulfing' | 'inside_bar' | 'outside_bar' |
  'morning_star' | 'evening_star' | 'three_white_soldiers' | 'three_black_crows' |
  'tweezer_top' | 'tweezer_bottom';

export interface PriceActionPattern {
  id: string; // Unique ID
  patternName: PatternType;
  direction: PatternDirection;
  patternStrength: number; // 0-100
  confidence: number; // 0-100
  startCandleIndex: number; // Index of the first candle in the pattern
  endCandleIndex: number; // Index of the last candle in the pattern
  triggerCandleIndex: number; // Index of the candle that completes/triggers the pattern
  confirmationCandleIndex: number | null; // Index of the candle that confirms the pattern (if applicable)
  price: number; // Pixel Y-coordinate of the pattern's significant level (e.g., high/low of trigger candle)
  timestamp: number; // Timestamp of the pattern's completion
  patternQuality: number; // 0-100, overall quality based on shape, size, context
  patternReliability: number; // 0-100, how often this pattern leads to expected outcome
  reversalProbability: number; // 0-100, probability of reversal
  continuationProbability: number; // 0-100, probability of continuation
}

export interface PriceActionData {
  latestPattern: PriceActionPattern | null;
  patternHistory: PriceActionPattern[];
  bullishPatternList: PriceActionPattern[];
  bearishPatternList: PriceActionPattern[];
  highestConfidencePattern: PriceActionPattern | null;
  priceActionSummary: string; // Human-readable summary
  overallConfidence: number; // 0-100, overall confidence in price action detection
}

// New interfaces for Fair Value Gap (FVG) & Imbalance Engine
export type FvgType = 'bullish' | 'bearish';
export type FvgStatus = 'fresh' | 'partially_filled' | 'completely_filled' | 'invalidated';

export interface FairValueGap {
  id: string; // Unique ID
  type: FvgType;
  direction: 'bullish' | 'bearish';
  startCandleIndex: number; // Index of the first candle in the 3-candle pattern
  middleCandleIndex: number; // Index of the middle candle in the 3-candle pattern
  endCandleIndex: number; // Index of the third candle in the 3-candle pattern
  gapHigh: number; // The higher pixel Y-coordinate of the gap (lower price)
  gapLow: number; // The lower pixel Y-coordinate of the gap (higher price)
  gapSize: number; // Pixel size of the gap
  fillPercentage: number; // 0-100, how much of the FVG has been filled
  currentStatus: FvgStatus;
  confidence: number; // 0-100, confidence in the FVG detection
  strength: number; // 0-100, strength of the FVG (e.g., based on gap size, context)
  timestamp: number; // Timestamp of the FVG creation (e.g., close time of end candle)
  distanceFromCurrentPrice: number; // Absolute pixel distance from current price
  fillProbability: number; // 0-100, likelihood of the FVG being filled
  mitigationProbability: number; // 0-100, likelihood of the FVG being mitigated (filled and price reacting)
  expectedReactionStrength: number; // 0-100, expected strength of price reaction at this FVG
}

export interface FvgData {
  nearestBullishFVG: FairValueGap | null;
  nearestBearishFVG: FairValueGap | null;
  activeFVGList: FairValueGap[];
  filledFVGList: FairValueGap[];
  invalidatedFVGList: FairValueGap[];
  fvgSummary: string; // Human-readable summary
  overallConfidence: number; // 0-100, overall confidence in FVG detection
}




// Updated Candle interface for OHLC Reconstruction Engine
export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number; // Optional, as not all charts display volume
  
  // Visual properties extracted from image
  bbox: BoundingBox; // Bounding box of the entire candle (wicks + body) in absolute screen coordinates
  bodyBbox: BoundingBox; // Bounding box of the candle body in absolute screen coordinates
  upperWickBbox: BoundingBox; // Bounding box of the upper wick in absolute screen coordinates
  lowerWickBbox: BoundingBox; // Bounding box of the lower wick in absolute screen coordinates
  
  candleWidth: number; // Pixel width of the candle body
  bodySize: number; // Pixel height of the candle body
  upperWickLength: number; // Pixel length of the upper wick
  lowerWickLength: number; // Pixel length of the lower wick
  totalHeight: number; // Pixel height from high to low (upper wick top to lower wick bottom)

  direction: 'bullish' | 'bearish' | 'doji'; // Candle direction based on open/close price or color
  relativeXPosition: number; // X-coordinate of the candle's center relative to candleDrawingRegion (0-1 for percentage)
  relativeYPosition: number; // Y-coordinate of the candle's midpoint relative to candleDrawingRegion (0-1 for percentage)
  
  // Note: Timestamp is not directly available from pixel data in this phase.
  relativeStrength?: number; // Optional: A derived metric, e.g., body size vs. total height, or volume-based
  confidence: number; // Confidence in the candle's detection and extracted values
  candleIndex?: number; // Index of the candle in the detected sequence (0 for oldest)
  rgbColor: { r: number; g: number; b: number; }; // RGB color of the candle body
}

// Re-introducing interfaces for dependencies of Order Block Engine
// New interfaces for Liquidity & Liquidity Sweep Engine
export type SweepType = 
  'buy_side_liquidity_sweep' | 'sell_side_liquidity_sweep' | 
  'internal_liquidity_sweep' | 'external_liquidity_sweep' | 'failed_liquidity_sweep' | 'valid_liquidity_grab' | 'stop_hunt' | 'sweep_rejection' | 'sweep_bos' | 'sweep_choch' | 'sweep_reversal';

export interface LiquiditySweep {
  sweepType: SweepType;
  direction: 'bullish' | 'bearish'; // Direction of the sweep (e.g., bullish sweep removes sell-side liquidity)
  priceLevel: number; // The price level where the sweep occurred
  startCandleIndex: number; // Index of the candle that defined the liquidity
  endCandleIndex: number; // Index of the candle that completed the sweep
  id: string; // Unique ID
  triggerCandleIndex: number; // Index of the candle that initiated the sweep (e.g., broke the level)
  confirmationCandleIndex: number | null; // Index of the candle that confirmed the sweep (e.g., closed back above/below)
  liquidityRemoved: LiquidityObject | null; // Reference to the liquidity object that was swept
  sweepStrength: number; // 0-100, strength of the sweep (e.g., how deep it went, volume)
  confidence: number; // 0-100, confidence in the detection of this sweep
  timestamp: number; // Timestamp of the sweep event (e.g., close time of the end candle)
  sweepDepth: number; // Pixel distance price moved past the liquidity level
  rejectionStrength: number; // 0-100, strength of the price rejection after the sweep
  associatedEvent: 'BOS' | 'CHOCH' | 'rejection' | 'reversal' | null; // Link to other market events
}

export type LiquidityType = 
  'internal_liquidity' | 'external_liquidity' | 
  'buy_side_liquidity' | 'sell_side_liquidity' | 
  'equal_highs' | 'equal_lows' | 'liquidity_pool' | 'stacked_liquidity' | 'resting_liquidity' | 'engineered_liquidity';

export interface LiquidityObject {
  type: LiquidityType;
  price: number;
  candleIndex: number; // Index of the candle where this liquidity was formed/identified
  strength: number; // 0-100, e.g., based on number of touches, volume, or duration
  confidence: number; // 0-100, confidence in the detection of this liquidity
  id: string; // Unique ID
  firstCandleIndex: number; // Index of the first candle contributing to this liquidity
  lastCandleIndex: number; // Index of the last candle contributing to this liquidity
  distanceFromCurrentPrice: number; // Absolute pixel distance from current price
  status: LiquidityStatus;
  timestamp: number; // Timestamp of the liquidity object's creation/last update
}

export type LiquidityStatus = 'active' | 'swept' | 'mitigated' | 'broken' | 'invalidated';

// New interface for Liquidity & Liquidity Sweep Engine output
export interface LiquidityData {
  nearestBuySideLiquidity: LiquidityObject | null;
  nearestSellSideLiquidity: LiquidityObject | null;
  liquidityList: LiquidityObject[]; // All detected active liquidity objects
  latestSweep: LiquiditySweep | null;
  sweepHistory: LiquiditySweep[]; // History of detected sweeps
  liquiditySummary: string; // Human-readable summary of current liquidity situation
  overallConfidence: number; // 0-100, overall confidence in liquidity detection
}

export interface MarketStructureEvent {
  id: string; // Unique ID
  eventType: 'BOS' | 'CHOCH';
  direction: 'bullish' | 'bearish'; // Direction of the event (e.g., bullish BOS, bearish CHOCH)
  type: 'internal' | 'external' | 'major' | 'minor'; // Type of structure break
  price: number; // The pixel Y-coordinate of the broken level (e.g., the price of the broken swing high/low)
  brokenSwing: SwingPoint; // Reference to the swing point that was broken
  brokenCandleIndex: number; // Index of the candle that formed the broken swing
  breakingCandleIndex: number; // Index of the candle that caused the break (first candle to close beyond the level)
  confirmationCandleIndex: number | null; // Index of the candle that confirmed the break
  strength: number; // 0-100, strength of the break (e.g., based on break distance, candle size)
  confidence: number; // 0-100, confidence in the detected event
  timestamp: number; // Timestamp of the event
  breakDistance: number; // Pixel distance price moved past the broken level
}

export interface BosChochData {
  latestBOS: MarketStructureEvent | null;
  latestCHOCH: MarketStructureEvent | null;
  bosHistory: MarketStructureEvent[];
  chochHistory: MarketStructureEvent[];
  currentStructureDirection: 'bullish' | 'bearish' | 'ranging' | 'undefined'; // Derived from BOS/CHOCH
  structureContinuation: number; // 0-100, probability of current structure continuing
  structureReversalProbability: number; // 0-100, probability of a reversal
  overallConfidence: number; // 0-100, overall confidence in BOS/CHOCH detection
}

// New interfaces for Market Structure Engine
export type MarketStructureType = 'bullish' | 'bearish' | 'range' | 'undefined';

export interface SwingPoint {
  id: string; // Unique ID for the swing point
  candleIndex: number; // Index of the candle in the `candles` array that forms this swing
  price: number;       // Pixel Y-coordinate of the swing (High for Swing High, Low for Swing Low)
  type: 'high' | 'low'; // Type of swing point
  isMajor: boolean; // True if it's a major swing, false for minor/internal (to be determined by logic)
  strength: number; // 0-100, importance/strength of the swing (e.g., based on number of candles forming it, price distance)
  confidence: number; // 0-100, confidence in the swing point detection
  timestamp: number; // Timestamp of the candle that forms the swing
  // Optional: Reference to the candle itself if needed for further analysis
  // candle: Candle;
}

export interface MarketStructureData {
  currentStructure: MarketStructureType;
  structureStrength: number; // 0-100, overall strength of the identified market structure
  structureConfidence: number; // 0-100, confidence in the identified market structure
  latestSwingHigh: SwingPoint | null;
  latestSwingLow: SwingPoint | null;
  higherHighs: SwingPoint[]; // List of detected Higher Highs
  higherLows: SwingPoint[]; // List of detected Higher Lows
  lowerHighs: SwingPoint[]; // List of detected Lower Highs
  lowerLows: SwingPoint[]; // List of detected Lower Lows
  allSwingPoints: SwingPoint[]; // All detected swing points (major and minor)
  structureSummary: string; // Human-readable summary of the current market structure
  // Removed BOS/CHOCH as per prompt instructions for this phase
  // Removed currentTrend, previousSwing, internalStructure, externalStructure from previous MarketStructureData interface
  // as they are either covered by TrendData or will be implemented in later phases.
}

// New interfaces for Trend Detection Engine
export type TrendDirection = 'strong_uptrend' | 'weak_uptrend' | 'strong_downtrend' | 'weak_downtrend' | 'sideways' | 'range_market' | 'accumulation' | 'distribution' | 'trend_exhaustion' | 'trend_reversal_candidate' | 'undefined';

export interface Trend {
  id: string; // Unique ID for the trend instance
  direction: TrendDirection;
  strength: number; // 0-100
  confidence: number; // 0-100
  startedCandleIndex: number; // Index of the candle where the trend started
  latestCandleIndex: number; // Index of the latest candle contributing to the trend
  timestamp: number; // Timestamp of the latest candle's close (or analysis time)
  momentumScore: number; // e.g., sum of (close - open) over trend candles
  slope: number; // Calculated slope of the trend line (pixel Y-coordinates)
  impulseStrength: number; // Strength of impulsive moves within the trend (pixel distance)
  pullbackStrength: number; // Strength of pullbacks within the trend (pixel distance)
  averageCandleSize: number; // Average total height of candles in the trend (pixels)
  bullBearDominance: number; // Positive for bullish dominance, negative for bearish dominance (count difference)
  trendDuration: number; // Number of candles in the trend
  currentPhase: 'impulse' | 'pullback' | 'consolidation' | 'reversal_attempt' | 'undefined';
}


export type MomentumState = 'Acceleration' | 'Deceleration' | 'Exhaustion' | 'Neutral';
export type MomentumDirection = 'Bullish' | 'Bearish' | 'Neutral';
export interface MomentumData {
  state: MomentumState;
  direction: MomentumDirection;
  strength: number; 
  score: number;
  confidence: number;
  explanation: string;
  acceleration: number; 
  deceleration: number; 
  exhaustionProbability: number;
}

export interface VolatilityData {
  atr: number;
  currentVolatility: number;
  averageVolatility: number;
  state: 'High' | 'Medium' | 'Low';
  confidence: number;
  explanation: string;
  volatilityIndex: number; 
  noiseLevel: number; 
  expectedMove: number; 
}

export interface TrendData {
  currentTrend: Trend | null;
  ocrConfidence: number | null; // Overall OCR confidence
  dataCompleteness: number; // Percentage of non-null fields in MarketState
  missingFieldCount: number; // Number of null fields in MarketState
  processingStatus: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE'; // Status of the analysis cycle
  // Future analysis results can be added here
}


export interface AnalysisData {
  frameId: number;
  lastUpdateTimestamp: number;
  captureLatency: number | null;
  ocrLatency: number | null;
  totalProcessingTime: number;
  visionConfidence: number | null;
  ocrConfidence: number | null;
  dataCompleteness: number;
  missingFieldCount: number;
  processingStatus: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE';
}

export interface VisionResult {
  tempDiagnostics?: any;
  timestamp: number;
  windowState: WindowState;
  ocrResult: OcrResult | null;
  candles: Candle[] | null;
  cleanChartImageBuffer: Buffer | null; // The image buffer of the clean chart area
  candleDrawingRegion: BoundingBox | null; // The bounding box of the candle drawing area (absolute screen coordinates)
  chartBounds: BoundingBox | null; // New field for the detected chart region
  olymptradeLayout: OlympTradeLayoutProfile | null; // New field for the Olymp Trade UI layout profile
  marketState: MarketState | null; // New field for aggregated market state
  analysisData: AnalysisData;
  connectionData: ChartConnectionData;
  healthStatus: HealthStatus; // New field for aggregated analysis data
  supportResistanceData: SupportResistanceData | null; // New field for support and resistance data
  bosChochData: BosChochData | null; // New field for BOS/CHOCH detection data
  marketStructureData: MarketStructureData | null; // New field for market structure data
  confluenceData: ConfluenceData | null;
  riskData: RiskData | null; // New field for SMC Confluence data
  aiDecisionData: AIDecisionData | null; // New field for AI Decision Engine data
  tradeScoreData: TradeScoreData | null; // New field for Trade Scoring data
  priceActionData: PriceActionData | null; // New field for Price Action detection data
  fvgData: FvgData | null; // New field for FVG detection data
  orderBlockData: OrderBlockData | null; // New field for Order Block detection data
  liquidityData: LiquidityData | null; // New field for liquidity and liquidity sweep data
  trendData: TrendData | null;
  momentumData: MomentumData | null;
  volatilityData: VolatilityData | null; // New field for trend detection data
  candleStrengthData: CandleStrengthData[] | null;
  liveMarketObservation: LiveMarketObservation | null;
  indicatorData: IndicatorData | null;
  multiTimeframeData: MultiTimeframeData | null;
  stabilityData: StabilityData | null;
  // Future analysis results can be added here
}

// Generic bounding box interface for regions on screen
export interface ChartDetectionResult {
  chartRegion: BoundingBox;
  priceAxis: BoundingBox;
  timeAxis: BoundingBox;
  candleArea: BoundingBox;
  indicatorArea: BoundingBox | null;
  confidence: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MarketState {
  assetName: string | null;
  timeframe: string | null; // e.g., "1m", "5m", "1h"
  currentPrice: number | null;
  balance: number | null;
  payoutPercentage: number | null; // e.g., 80 for 80%
  expiryTime: string | null; // e.g., "00:30", "1:00"
  buyButtonDetected: boolean;
  sellButtonDetected: boolean;
  visibleTimer: string | null; // e.g., "00:25"
  /**
   * All numerical values detected in the OCR, for general analysis or debugging.
   * This can be used for more advanced contextual parsing in later phases.
   */
  allNumbers: number[];
}

export interface OlympTradeLayoutProfile {
  assetArea: BoundingBox; // Absolute screen coordinates of the asset name display area
  balanceArea: BoundingBox; // Absolute screen coordinates of the balance display area
  timeframeArea: BoundingBox; // Absolute screen coordinates of the selected timeframe display area
  expiryArea: BoundingBox; // Absolute screen coordinates of the trade expiry time display area
  buyButton: BoundingBox; // Absolute screen coordinates of the Buy button
  sellButton: BoundingBox; // Absolute screen coordinates of the Sell button
  toolbar: BoundingBox; // Absolute screen coordinates of the top toolbar
  statusArea: BoundingBox; // Absolute screen coordinates of the bottom status area
  // Add other static UI regions as identified in the Olymp Trade interface
}

export interface SupportResistanceLevel {
  id: string; // Unique ID for the level
  price: number; // number or 'Calculating...'
  levelType: 'support' | 'resistance' | 'major_support' | 'major_resistance' | 'weak_support' | 'weak_resistance' | 'retested_support' | 'retested_resistance' | 'broken_support' | 'broken_resistance';
  strength: number; // 0-100
  touchCount: number;
  firstCandleIndex: number;
  lastCandleIndex: number;
  distance: number; // distance or 'Calculating...'
  reactionCount: number;
  breakProbability: number;
  confidence: number;
  timestamp: number;
  displayPrice?: string;
  displayDistance?: string;
}

export interface SupportResistanceData {
  nearestSupport: SupportResistanceLevel | null;
  nearestResistance: SupportResistanceLevel | null;
  supportList: SupportResistanceLevel[];
  resistanceList: SupportResistanceLevel[];
}
// ==========================================
// Phase 1-5 Upgrade Types
// ==========================================

export interface CandleStrengthData {
  bodySize: number;
  upperWick: number;
  lowerWick: number;
  bodyRatio: number;
  closePosition: number;
  openPosition: number;
  strengthScore: number;
}

export type BehaviourState = 
  'Momentum Increasing' | 'Momentum Weakening' | 
  'Buying Pressure Increasing' | 'Selling Pressure Increasing' |
  'Repeated Rejection' | 'Repeated Support Tests' | 'Repeated Resistance Tests' |
  'False Breakout Attempts' | 'Strong Continuation' | 'Weak Continuation' |
  'Compression Before Breakout' | 'Exhaustion' | 'None';

export interface ObservationData {
  timestamp: number;
  price: number;
  candleSpeed: number;
  acceleration: number;
  microPullbacks: number;
}

export interface LiveMarketObservation {
  observationCount?: number;
  memoryBufferSize?: number;
  oldestObservation?: number;
  newestObservation?: number;
  averageUpdateRateMs?: number;
  activeBehaviours: BehaviourState[];
  buffer5s: ObservationData[];
  buffer15s: ObservationData[];
  buffer30s: ObservationData[];
  buffer60s: ObservationData[];
}

export interface TimeframeState {
  timeframe: string;
  timestamp: number;
  age: number;
  freshnessScore: number; // 0-100
  confidenceDecay: number; // 0-100
  marketState: MarketState | null;
  trendData: TrendData | null;
  supportResistanceData: SupportResistanceData | null;
  priceActionData: PriceActionData | null;
}

export interface MultiTimeframeData {
  timeframes: Record<string, TimeframeState>;
  consensusScore: number;
  trendAgreement: number;
  momentumAgreement: number;
  srAgreement: number;
  volatilityAgreement: number;
}

export interface IndicatorReading {
  name: string;
  value: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  priority: 1 | 2 | 3 | 4; // 1: Native, 2: OCR, 3: Approx, 4: Skip
  confidence: number;
}

export interface IndicatorData {
  trend: IndicatorReading[];
  momentum: IndicatorReading[];
  oscillators: IndicatorReading[];
  volatility: IndicatorReading[];
  volume: IndicatorReading[];
  trendStrength: IndicatorReading[];
}

export interface StabilityData {
  stableSignal: AIDecisionType;
  persistenceTime: number; // ms
  isFlipping: boolean;
  confidenceStability: number; // 0-100
}


export interface ChartConnectionData {
  status: 'CONNECTED' | 'DISCONNECTED';
  fps: number;
  latencyMs: number;
  lastFrameTimestamp: number;
  pixelChangeScore: number;
  freshnessScore: number;
  reason: string;
}

export interface HealthStatus {
  screenCapture: string;
  chartDetection: string;
  visionEngine: string;
  ocrEngine: string;
  observationEngine: string;
  marketMemory: string;
  indicatorEngine: string;
  patternEngine: string;
  bayesianEngine: string;
  decisionEngine: string;
  overlay: string;
}
