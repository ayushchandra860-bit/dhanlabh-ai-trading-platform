export interface WindowMatchResult {
  matched: boolean;
  confidence: number;
}
export interface PercentRect {
  top: number; left: number; width: number; height: number;
}
export interface ChartRegionHints {
  top: number; bottom: number; left: number; right: number;
  innerTop: number; innerBottom: number; innerLeft: number; innerRight: number;
}
export interface OcrLandmark {
  id: string; regionHint: PercentRect; expectedPattern: RegExp; anchorRole: 'chart_boundary' | 'ui_chrome' | 'data_field';
}
export interface ProtectedRegion {
  id: string; regionHint: PercentRect; description: string; isHard: boolean;
}
export interface ActiveCandleRegion {
  fromRightPercent: number; widthPercent: number;
}
export interface CvAnchor {
  id: string; role: 'top_bar' | 'bottom_bar' | 'left_nav' | 'right_panel' | 'chart_bg';
  colorSignature: { hMin: number; hMax: number; sMin: number; sMax: number; vMin: number; vMax: number; };
  expectedPosition: PercentRect;
}

export const OlympTradeConfig = {
  brokerName: 'OlympTrade',
  displayName: 'Olymp Trade',
  version: '1.0.0',

  getChartRegionHints: (): ChartRegionHints => ({
    top: 0.10, bottom: 0.15, left: 0.05, right: 0.22,
    innerTop: 0.04, innerBottom: 0.07, innerLeft: 0.03, innerRight: 0.06,
  }),

  getOcrLandmarks: (): OcrLandmark[] => [
    { id: 'asset_name', regionHint: { top: 0.02, left: 0.14, width: 0.12, height: 0.05 }, expectedPattern: /^[A-Z]{2,6}([/-][A-Z]{2,6})?$/, anchorRole: 'data_field' },
    { id: 'balance', regionHint: { top: 0.02, left: 0.68, width: 0.12, height: 0.05 }, expectedPattern: /^\$?[\d,]+\.?\d{0,2}$/, anchorRole: 'data_field' },
    { id: 'expiry_time', regionHint: { top: 0.02, left: 0.38, width: 0.10, height: 0.05 }, expectedPattern: /^\d{1,2}:\d{2}(:\d{2})?$/, anchorRole: 'data_field' },
    { id: 'payout_percentage', regionHint: { top: 0.78, left: 0.78, width: 0.06, height: 0.06 }, expectedPattern: /^\d{2,3}%$/, anchorRole: 'data_field' },
    { id: 'buy_button', regionHint: { top: 0.78, left: 0.78, width: 0.10, height: 0.08 }, expectedPattern: /buy/i, anchorRole: 'chart_boundary' },
    { id: 'sell_button', regionHint: { top: 0.78, left: 0.68, width: 0.10, height: 0.08 }, expectedPattern: /sell/i, anchorRole: 'chart_boundary' },
  ],

  getProtectedRegions: (): ProtectedRegion[] => [
    { id: 'top_asset_tabs', regionHint: { top: 0.00, left: 0.00, width: 1.00, height: 0.08 }, description: 'Asset tab strip', isHard: true },
    { id: 'account_balance_area', regionHint: { top: 0.00, left: 0.60, width: 0.40, height: 0.08 }, description: 'Account balance', isHard: true },
    { id: 'left_navigation', regionHint: { top: 0.08, left: 0.00, width: 0.04, height: 0.92 }, description: 'Left icon navigation strip', isHard: true },
    { id: 'right_trade_panel', regionHint: { top: 0.08, left: 0.78, width: 0.22, height: 0.77 }, description: 'BUY/SELL amount input', isHard: true },
    { id: 'bottom_platform_controls', regionHint: { top: 0.85, left: 0.00, width: 1.00, height: 0.15 }, description: 'Platform footer controls', isHard: true },
    { id: 'price_axis', regionHint: { top: 0.08, left: 0.72, width: 0.06, height: 0.77 }, description: 'Price axis labels', isHard: true },
    { id: 'time_axis', regionHint: { top: 0.82, left: 0.04, width: 0.68, height: 0.03 }, description: 'Time axis label strip', isHard: true },
  ],

  getActiveCandleRegion: (): ActiveCandleRegion => ({
    fromRightPercent: 0.06,
    widthPercent: 0.04,
  }),

  getCvAnchors: (): CvAnchor[] => [
    { id: 'olymp_top_bar', role: 'top_bar', colorSignature: { hMin: 205, hMax: 235, sMin: 0.08, sMax: 0.35, vMin: 0.08, vMax: 0.22 }, expectedPosition: { top: 0.00, left: 0.00, width: 1.00, height: 0.08 } },
    { id: 'olymp_right_panel', role: 'right_panel', colorSignature: { hMin: 210, hMax: 235, sMin: 0.05, sMax: 0.25, vMin: 0.06, vMax: 0.18 }, expectedPosition: { top: 0.08, left: 0.78, width: 0.22, height: 0.77 } },
    { id: 'olymp_bottom_bar', role: 'bottom_bar', colorSignature: { hMin: 205, hMax: 235, sMin: 0.08, sMax: 0.30, vMin: 0.07, vMax: 0.20 }, expectedPosition: { top: 0.85, left: 0.00, width: 1.00, height: 0.15 } },
  ]
};
