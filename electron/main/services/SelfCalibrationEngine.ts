import { LoggerService } from '../LoggerService';
import { SignalAnalyticsService } from './SignalAnalyticsService';

export interface CalibratedParameters {
  minEntryConfidenceThreshold: number; // e.g. 58% - 68%
  dropConfidenceThreshold: number;      // e.g. 48% - 52% (for hysteresis)
  weights: {
    trend: number;
    marketStructure: number;
    momentum: number;
    volatility: number;
    supportResistance: number;
    candleBehavior: number;
    priceAction: number;
  };
}

export class SelfCalibrationEngine {
  private static instance: SelfCalibrationEngine;
  private currentParams: CalibratedParameters = {
    minEntryConfidenceThreshold: 60,
    dropConfidenceThreshold: 50,
    weights: {
      trend: 0.20,
      marketStructure: 0.20,
      momentum: 0.15,
      volatility: 0.10,
      supportResistance: 0.15,
      candleBehavior: 0.10,
      priceAction: 0.10,
    },
  };

  private lastCalibrationTime = 0;

  private constructor() {}

  public static getInstance(): SelfCalibrationEngine {
    if (!SelfCalibrationEngine.instance) {
      SelfCalibrationEngine.instance = new SelfCalibrationEngine();
    }
    return SelfCalibrationEngine.instance;
  }

  /**
   * Recalibrates parameters based on historical trade outcomes (Phase 6 Self-Calibration)
   */
  public async getCalibratedParameters(): Promise<CalibratedParameters> {
    const now = Date.now();
    // Recalibrate at most once every 30 seconds
    if (now - this.lastCalibrationTime < 30000) {
      return this.currentParams;
    }

    this.lastCalibrationTime = now;

    try {
      const analytics = await SignalAnalyticsService.getInstance().getInternalAnalytics();

      if (analytics.completedTradesCount >= 5) {
        const overallWinRate = analytics.winRate;

        // If win rate is strong (>75%), reduce conservative lock to capture high probability setups earlier
        if (overallWinRate >= 75) {
          this.currentParams.minEntryConfidenceThreshold = 58;
          this.currentParams.dropConfidenceThreshold = 48;
          LoggerService.info(`SelfCalibrationEngine: High win rate (${overallWinRate}%). Dynamic entry threshold calibrated to 58%.`);
        } else if (overallWinRate < 60 && analytics.completedTradesCount >= 10) {
          // If win rate is low (<60%), tighten threshold to filter weak setups
          this.currentParams.minEntryConfidenceThreshold = 65;
          this.currentParams.dropConfidenceThreshold = 52;
          LoggerService.info(`SelfCalibrationEngine: Lower win rate (${overallWinRate}%). Tightened dynamic entry threshold to 65%.`);
        } else {
          this.currentParams.minEntryConfidenceThreshold = 60;
          this.currentParams.dropConfidenceThreshold = 50;
        }

        // Adjust component weights based on false signal rate
        if (analytics.falseSignalRate > 30) {
          this.currentParams.weights.supportResistance = 0.20;
          this.currentParams.weights.marketStructure = 0.22;
          this.currentParams.weights.momentum = 0.10;
        }
      }
    } catch (e) {
      LoggerService.warn(`SelfCalibrationEngine: Error during self-calibration: ${e}`);
    }

    return this.currentParams;
  }
}
