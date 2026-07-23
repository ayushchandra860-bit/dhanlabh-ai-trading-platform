import { LoggerService } from '../LoggerService';
import { AIDecisionType, StabilityData } from '../vision';

export class SignalStabilityEngine {
  private lastSignal: AIDecisionType = 'WAIT';
  private lastSignalTimestamp: number = 0;
  private signalHistory: { signal: AIDecisionType, timestamp: number, confidence: number }[] = [];
  
  // Configuration
  private readonly MIN_PERSISTENCE_MS = 5000; // 5 seconds of stability required

  public analyzeStability(
    rawSignal: AIDecisionType,
    rawConfidence: number,
    timestamp: number
  ): StabilityData {
    this.signalHistory.push({ signal: rawSignal, timestamp, confidence: rawConfidence });
    
    // Purge old history (> 15 seconds)
    this.signalHistory = this.signalHistory.filter(h => timestamp - h.timestamp < 15000);

    // Calculate stability
    const last3Seconds = this.signalHistory.filter(h => timestamp - h.timestamp <= 3000);
    const isFlipping = new Set(last3Seconds.map(h => h.signal)).size > 2; // e.g., BUY, SELL, WAIT rapidly

    // Count how long the current rawSignal has been consistently outputted
    let persistenceTime = 0;
    for (let i = this.signalHistory.length - 1; i >= 0; i--) {
      if (this.signalHistory[i].signal === rawSignal) {
        persistenceTime = timestamp - this.signalHistory[i].timestamp;
      } else {
        break;
      }
    }

    let stableSignal = this.lastSignal;
    
    // If we meet the persistence threshold and we are not rapidly flipping, we can transition
    if (persistenceTime >= this.MIN_PERSISTENCE_MS && !isFlipping) {
      stableSignal = rawSignal;
    }

    // Confidence Stability (variance of confidence)
    let confidenceStability = 100;
    if (this.signalHistory.length > 1) {
       const avgConf = this.signalHistory.reduce((a, b) => a + b.confidence, 0) / this.signalHistory.length;
       const variance = this.signalHistory.reduce((a, b) => a + Math.pow(b.confidence - avgConf, 2), 0) / this.signalHistory.length;
       confidenceStability = Math.max(0, 100 - Math.sqrt(variance));
    }

    // Update state if changed
    if (stableSignal !== this.lastSignal) {
      LoggerService.info(`SignalStabilityEngine: Signal transitioned from ${this.lastSignal} to ${stableSignal} after ${persistenceTime}ms of persistence.`);
      this.lastSignal = stableSignal;
      this.lastSignalTimestamp = timestamp;
    }

    return {
      stableSignal,
      persistenceTime,
      isFlipping,
      confidenceStability
    };
  }
}
