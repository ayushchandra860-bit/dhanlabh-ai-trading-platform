import { ValidationReport } from './CalibrationTypes';
import { CognitiveHypothesis } from '../reasoning/HypothesisGenerationEngine';
import { LoggerService } from '../../../LoggerService';

export interface HistoricalRecord {
  hypothesis: CognitiveHypothesis;
  actualOutcome: 'CONTINUATION' | 'REVERSAL' | 'BREAKOUT' | 'CHOP';
  timestamp: number;
  dataQualityScore: number;
}

export class CalibrationDatasetValidator {
  
  private readonly MIN_SAMPLES = 50;
  private readonly MIN_QUALITY_SCORE = 75.0; // Assuming 0-100 scale
  private readonly MAX_CLASS_IMBALANCE_RATIO = 0.75; // No single class should be > 75% of dataset
  
  /**
   * Validates a dataset before it can be used for calibration or testing.
   */
  public validate(dataset: HistoricalRecord[]): ValidationReport {
    const report: ValidationReport = {
      isValid: true,
      warnings: [],
      errors: [],
      datasetSize: dataset.length
    };

    // 1. Insufficient samples
    if (dataset.length < this.MIN_SAMPLES) {
      report.errors.push(`Insufficient samples: ${dataset.length} (min required: ${this.MIN_SAMPLES})`);
      report.isValid = false;
    }

    // 2. Corrupted data & Quality
    let validRecords = 0;
    const timestamps = new Set<number>();
    let duplicates = 0;
    let corrupted = 0;
    
    const classCounts: Record<string, number> = {
      'CONTINUATION': 0,
      'REVERSAL': 0,
      'BREAKOUT': 0,
      'CHOP': 0
    };

    for (const record of dataset) {
      // Missing fields check
      if (!record.hypothesis || !record.actualOutcome || !record.timestamp) {
        corrupted++;
        continue;
      }
      
      // Quality score check
      if (record.dataQualityScore < this.MIN_QUALITY_SCORE) {
        corrupted++; // Treat low quality as corrupted/unusable for calibration
        continue;
      }

      // Duplicate observations check
      if (timestamps.has(record.timestamp)) {
        duplicates++;
        continue;
      }
      timestamps.add(record.timestamp);

      // Tally for class imbalance
      if (classCounts[record.actualOutcome] !== undefined) {
         classCounts[record.actualOutcome]++;
      }
      
      validRecords++;
    }

    if (corrupted > 0) {
      report.errors.push(`Corrupted or low-quality data detected: ${corrupted} records.`);
      report.isValid = false;
    }

    if (duplicates > 0) {
      report.errors.push(`Duplicate observations detected: ${duplicates} records.`);
      report.isValid = false;
    }

    // 3. Class Imbalance
    if (validRecords > 0) {
      for (const [className, count] of Object.entries(classCounts)) {
        const ratio = count / validRecords;
        if (ratio > this.MAX_CLASS_IMBALANCE_RATIO) {
          report.errors.push(`Class imbalance exceeds threshold: ${className} is ${(ratio*100).toFixed(1)}% of dataset.`);
          report.isValid = false;
        }
      }
    }

    if (!report.isValid) {
      LoggerService.error(`[DatasetValidator] Calibration rejected. Errors: ${report.errors.join(' | ')}`);
    } else {
      LoggerService.info(`[DatasetValidator] Dataset validated successfully. Size: ${validRecords}`);
    }

    return report;
  }
}
