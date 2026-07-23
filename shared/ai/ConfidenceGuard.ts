// =============================================================================
// ConfidenceGuard
//
// Evaluates data quality before any BUY/SELL signal is generated.
// If any confidence metric falls below its configured threshold, the guard
// blocks signal generation and returns a detailed failure report.
//
// This ensures the overlay NEVER displays misleading trading signals when
// OCR, vision analysis, or chart detection quality is insufficient.
// =============================================================================

export interface ConfidenceThresholds {
  /** Minimum acceptable OCR confidence (0–100). Default: 50 */
  minOcrConfidence: number;
  /** Minimum acceptable vision/analysis confidence (0–100). Default: 60 */
  minVisionConfidence: number;
  /** Minimum acceptable chart detection confidence (0–100). Default: 70 */
  minChartDetectionConfidence: number;
}

export const DEFAULT_CONFIDENCE_THRESHOLDS: ConfidenceThresholds = {
  minOcrConfidence:              50,
  minVisionConfidence:           60,
  minChartDetectionConfidence:   70,
};

export interface ConfidenceReport {
  /** Raw OCR confidence from Tesseract (0–100) */
  ocrConfidence: number;
  /** Aggregate analysis confidence from VisionManager (0–100) */
  visionConfidence: number;
  /** Chart region detection confidence from ChartRegionDetector (0–100) */
  chartDetectionConfidence: number;
  /** min(ocr, vision, chartDetection) — overall data quality score */
  overallConfidence: number;
  /** True only when ALL thresholds are met */
  isAboveThreshold: boolean;
  /** Human-readable list of what is failing and why */
  failingReasons: string[];
}

/**
 * Evaluate all confidence metrics against the configured thresholds.
 *
 * @param ocrConfidence            Raw OCR confidence from OcrService (0–100)
 * @param visionConfidence         Aggregate confidence from VisionManager (0–100)
 * @param chartDetectionConfidence Confidence from ChartRegionDetector (0–100)
 * @param thresholds               Configured minimum thresholds
 */
export function evaluateConfidence(
  ocrConfidence: number,
  visionConfidence: number,
  chartDetectionConfidence: number,
  thresholds: ConfidenceThresholds = DEFAULT_CONFIDENCE_THRESHOLDS,
): ConfidenceReport {
  const failingReasons: string[] = [];

  if (ocrConfidence < thresholds.minOcrConfidence) {
    failingReasons.push(
      `OCR quality too low: ${ocrConfidence.toFixed(0)}% (min ${thresholds.minOcrConfidence}%)`,
    );
  }

  if (visionConfidence < thresholds.minVisionConfidence) {
    failingReasons.push(
      `Vision analysis quality too low: ${visionConfidence.toFixed(0)}% (min ${thresholds.minVisionConfidence}%)`,
    );
  }

  if (chartDetectionConfidence < thresholds.minChartDetectionConfidence) {
    failingReasons.push(
      `Chart detection confidence too low: ${chartDetectionConfidence.toFixed(0)}% (min ${thresholds.minChartDetectionConfidence}%)`,
    );
  }

  const overallConfidence = Math.min(
    ocrConfidence,
    visionConfidence,
    chartDetectionConfidence,
  );

  return {
    ocrConfidence,
    visionConfidence,
    chartDetectionConfidence,
    overallConfidence,
    isAboveThreshold: failingReasons.length === 0,
    failingReasons,
  };
}
