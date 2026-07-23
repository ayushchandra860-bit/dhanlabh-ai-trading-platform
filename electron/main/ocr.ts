export interface OcrWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number; };
}

export interface MarketData {
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

export interface OcrResult {
  text: string;
  confidence: number; // Overall confidence
  words: OcrWord[];
  marketData: MarketData | null; // New field for structured market data
}