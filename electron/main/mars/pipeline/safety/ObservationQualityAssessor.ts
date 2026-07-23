import { VisionResult } from '../../../vision';
import { LoggerService } from '../../../LoggerService';

export interface ObservationQualityReport {
  isValid: boolean;
  qualityScore: number; // 0-100
  rejectReason?: string;
}

export class ObservationQualityAssessor {
  private readonly MIN_QUALITY_SCORE = 60;
  
  public assess(visionResult: VisionResult): ObservationQualityReport {
    try {
      let score = 100;
      
      // 1. Missing Candles Check
      if (!visionResult.candles || visionResult.candles.length < 10) {
        return { isValid: false, qualityScore: 0, rejectReason: 'INSUFFICIENT_CANDLES' };
      }

      // 2. OCR Confidence Check
      if (visionResult.ocrResult && visionResult.analysisData.ocrConfidence) {
        if (visionResult.analysisData.ocrConfidence < 0.6) {
          score -= 30; // Heavy penalty for bad OCR
        }
      } else {
        score -= 20; // Penalty for missing OCR data entirely
      }

      // 3. Vision/Chart Confidence
      if (visionResult.analysisData.visionConfidence) {
        if (visionResult.analysisData.visionConfidence < 0.7) {
          score -= 20;
        }
      }

      // 4. Data Completeness
      if (visionResult.analysisData.dataCompleteness < 0.5) {
        score -= 20;
      }

      const isValid = score >= this.MIN_QUALITY_SCORE;
      
      if (!isValid) {
        LoggerService.warn(`[MARS Quality] Observation rejected. Score: ${score}. Reason: LOW_QUALITY`);
      }

      return {
        isValid,
        qualityScore: Math.max(0, score),
        rejectReason: isValid ? undefined : 'LOW_QUALITY_SCORE'
      };
    } catch (err) {
      LoggerService.error(`[MARS Quality] Assessor crashed: ${err}`);
      return { isValid: false, qualityScore: 0, rejectReason: 'ASSESSOR_CRASH' };
    }
  }
}
