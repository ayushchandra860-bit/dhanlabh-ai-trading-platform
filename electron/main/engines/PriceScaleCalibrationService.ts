import { LoggerService } from '../LoggerService';
import { OcrResult } from '../ocr';
import { WindowState } from '../../../shared/types/window';

export interface CalibrationResult {
  pricePerPixel: number;
  yIntercept: number; 
  confidence: number;
}

export class PriceScaleCalibrationService {
  private _cache: CalibrationResult | null = null;
  private _lastTimeframe: string | null = null;
  private _lastWindowSize = { width: 0, height: 0 };

  public calibrate(ocrResult: OcrResult | null, windowState: WindowState, timeframe: string | null, forceRecalculate = false): CalibrationResult | null {
    if (!ocrResult || !windowState.size) {
      return this._cache;
    }

    const { width, height } = windowState.size;
    const isResized = width !== this._lastWindowSize.width || height !== this._lastWindowSize.height;
    const isTimeframeChanged = timeframe !== this._lastTimeframe;
    const ocrConfidenceLow = ocrResult.confidence < 50;
    
    if (!forceRecalculate && this._cache && !isResized && !isTimeframeChanged && !ocrConfidenceLow) {
      return this._cache;
    }

    LoggerService.info('PriceScaleCalibrationService: Running OCR Calibration on Price Axis...');

    const rightAxisThresholdX = width * 0.85;
    
    const priceLabels = ocrResult.words.filter(w => {
      if (w.bbox.x0 < rightAxisThresholdX) return false;
      const cleanText = w.text.replace(/,/g, '.');
      if (isNaN(parseFloat(cleanText))) return false;
      return cleanText.length > 2; 
    }).map(w => {
      const price = parseFloat(w.text.replace(/,/g, '.'));
      const y = (w.bbox.y0 + w.bbox.y1) / 2;
      return { price, y };
    });

    if (priceLabels.length < 2) {
      LoggerService.warn('PriceScaleCalibrationService: Not enough valid price labels detected on axis.');
      return this._cache;
    }

    let sumY = 0, sumPrice = 0, sumYPrice = 0, sumYSq = 0;
    const n = priceLabels.length;

    for (const p of priceLabels) {
      sumY += p.y;
      sumPrice += p.price;
      sumYPrice += (p.y * p.price);
      sumYSq += (p.y * p.y);
    }

    const denominator = (n * sumYSq - sumY * sumY);
    if (denominator === 0) return this._cache;

    const m = (n * sumYPrice - sumY * sumPrice) / denominator;
    const b = (sumPrice - m * sumY) / n;

    let ssTot = 0, ssRes = 0;
    const meanPrice = sumPrice / n;
    
    for (const p of priceLabels) {
      const expectedPrice = m * p.y + b;
      ssTot += (p.price - meanPrice) ** 2;
      ssRes += (p.price - expectedPrice) ** 2;
    }

    let rSquared = 1;
    if (ssTot > 0) rSquared = 1 - (ssRes / ssTot);
    
    const confidence = Math.max(0, Math.min(100, Math.round(rSquared * 100)));

    if (confidence < 80) {
      LoggerService.warn(`PriceScaleCalibrationService: Low calibration confidence (${confidence}%).`);
      if (this._cache && this._cache.confidence > confidence) return this._cache;
    }

    const newCalibration = { pricePerPixel: m, yIntercept: b, confidence };
    LoggerService.info(`PriceScaleCalibrationService: Calibrated. R^2: ${confidence}%, Price = Y * ${m.toFixed(5)} + ${b.toFixed(5)}`);

    this._cache = newCalibration;
    this._lastWindowSize = { width, height };
    this._lastTimeframe = timeframe;

    return newCalibration;
  }

  public getPriceForY(y: number): number | null {
    if (!this._cache || this._cache.confidence < 80) return null;
    return (y * this._cache.pricePerPixel) + this._cache.yIntercept;
  }

  public getDistanceForPixels(dy: number): number | null {
    if (!this._cache || this._cache.confidence < 80) return null;
    return Math.abs(dy * this._cache.pricePerPixel);
  }
}
