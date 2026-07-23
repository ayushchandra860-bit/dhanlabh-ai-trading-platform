import { DecisionLogEntry, ValidationMetrics, FailureCategory } from './ValidationTypes';
import { LoggerService } from '../../../LoggerService';
import fs from 'fs';
import path from 'path';

export class ValidationReporter {
  
  public generateReport(logs: DecisionLogEntry[], outputPath: string): void {
    const metrics = this.calculateMetrics(logs);
    
    let md = `# MARS V2.1 Historical Validation Report\n\n`;
    md += `*Generated: ${new Date().toISOString()}*\n\n`;
    
    md += `## Executive Summary\n`;
    md += `- **Total Decisions Evaluated:** ${metrics.totalDecisions}\n`;
    md += `- **Overall Accuracy:** ${(metrics.accuracy * 100).toFixed(2)}%\n`;
    md += `- **Win Rate (Trades):** ${(metrics.winRate * 100).toFixed(2)}%\n`;
    md += `- **Loss Rate:** ${(metrics.lossRate * 100).toFixed(2)}%\n`;
    md += `- **Average Confidence:** ${(metrics.avgConfidence).toFixed(2)}%\n`;
    md += `- **Brier Score (Calibration Error):** ${metrics.brierScore.toFixed(4)}\n\n`;

    md += `## Trading Efficacy\n`;
    md += `- **Precision (BUY):** ${(metrics.precisionBuy * 100).toFixed(2)}%\n`;
    md += `- **Recall (BUY):** ${(metrics.recallBuy * 100).toFixed(2)}%\n`;
    md += `- **F1 Score:** ${(metrics.f1Buy * 100).toFixed(2)}%\n`;
    md += `- **Profit Factor:** ${metrics.profitFactor.toFixed(2)}\n`;
    md += `- **Expectancy:** ${metrics.expectancy.toFixed(2)} units/trade\n`;
    md += `- **Max Drawdown:** ${metrics.maxDrawdown.toFixed(2)} units\n\n`;

    md += `## Failure Analysis\n`;
    md += `| Failure Category | Count | %\n`;
    md += `| --- | --- | ---\n`;
    
    for (const [cat, count] of Object.entries(metrics.failuresByCategory)) {
      if (cat !== 'NONE') {
        const pct = metrics.totalDecisions > 0 ? ((count / metrics.totalDecisions) * 100).toFixed(2) : '0.00';
        md += `| **${cat}** | ${count} | ${pct}% |\n`;
      }
    }
    
    md += `\n## Regime Performance\n`;
    md += `| Regime | Win | Loss | Win Rate |\n`;
    md += `| --- | --- | --- | --- |\n`;
    for (const [regime, stats] of Object.entries(metrics.regimePerformance)) {
      const total = stats.win + stats.loss;
      const wr = total > 0 ? ((stats.win / total) * 100).toFixed(2) : '0.00';
      md += `| ${regime} | ${stats.win} | ${stats.loss} | ${wr}% |\n`;
    }

    try {
      fs.writeFileSync(outputPath, md);
      LoggerService.info(`[ValidationReporter] Saved dashboard report to ${outputPath}`);
    } catch (err) {
      LoggerService.error(`[ValidationReporter] Failed to save report: ${err}`);
    }
  }

  private calculateMetrics(logs: DecisionLogEntry[]): ValidationMetrics {
    let tp = 0; // True Positive (Profitable BUY)
    let fp = 0; // False Positive (False BUY)
    let fn = 0; // False Negative (Missed BUY)
    let tn = 0; // True Negative (Correctly HOLDING/SELLING when market drops)
    
    let totalWins = 0;
    let totalLosses = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let brierSum = 0;
    let peakEquity = 0;
    let currentEquity = 0;
    let maxDrawdown = 0;
    let confSum = 0;
    
    const failuresByCategory: Record<FailureCategory, number> = {
      'FALSE_BUY': 0, 'FALSE_SELL': 0, 'FALSE_HOLD': 0, 'LATE_ENTRY': 0, 
      'EARLY_EXIT': 0, 'CONFIDENCE_OVERESTIMATION': 0, 'CONFIDENCE_UNDERESTIMATION': 0, 
      'WRONG_REGIME': 0, 'PATTERN_MISMATCH': 0, 'NONE': 0
    };

    const regimePerformance: Record<string, { win: number, loss: number }> = {};

    for (const log of logs) {
      // 1. Core counters
      if (!regimePerformance[log.regime]) {
        regimePerformance[log.regime] = { win: 0, loss: 0 };
      }

      confSum += log.confidence;

      if (log.recommendation === 'BUY') {
        if (log.isCorrect) {
          tp++;
          totalWins++;
          grossProfit += Math.max(0, log.priceDelta || 1); // Mock positive delta
          currentEquity += Math.max(0, log.priceDelta || 1);
          regimePerformance[log.regime].win++;
        } else {
          fp++;
          totalLosses++;
          grossLoss += Math.abs(Math.min(0, log.priceDelta || -1));
          currentEquity -= Math.abs(Math.min(0, log.priceDelta || -1));
          regimePerformance[log.regime].loss++;
        }
      } else if (log.recommendation === 'SELL' || log.recommendation === 'WAIT') {
        if (log.isCorrect) {
          tn++;
          if (log.recommendation === 'SELL') {
             totalWins++;
             grossProfit += Math.abs(log.priceDelta || 1);
             currentEquity += Math.abs(log.priceDelta || 1);
             regimePerformance[log.regime].win++;
          }
        } else {
          fn++;
          if (log.recommendation === 'SELL') {
             totalLosses++;
             grossLoss += Math.abs(log.priceDelta || 1);
             currentEquity -= Math.abs(log.priceDelta || 1);
             regimePerformance[log.regime].loss++;
          }
        }
      }

      // Equity tracking for Drawdown
      if (currentEquity > peakEquity) peakEquity = currentEquity;
      const dd = peakEquity - currentEquity;
      if (dd > maxDrawdown) maxDrawdown = dd;

      // Failures
      if (log.failureCategory) {
        failuresByCategory[log.failureCategory]++;
      }

      // Brier Score
      // P(True) mapped to 1 if isCorrect, 0 if not
      const actual = log.isCorrect ? 1.0 : 0.0;
      brierSum += Math.pow((log.confidence / 100.0) - actual, 2);
    }

    const totalDecisions = logs.length;
    const accuracy = totalDecisions > 0 ? (tp + tn) / totalDecisions : 0;
    const precisionBuy = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const recallBuy = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const f1Buy = (precisionBuy + recallBuy) > 0 ? 2 * ((precisionBuy * recallBuy) / (precisionBuy + recallBuy)) : 0;
    
    const totalTrades = totalWins + totalLosses;
    const winRate = totalTrades > 0 ? totalWins / totalTrades : 0;
    const lossRate = totalTrades > 0 ? totalLosses / totalTrades : 0;
    
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 999 : 0);
    const expectancy = totalTrades > 0 ? ((grossProfit - grossLoss) / totalTrades) : 0;
    const brierScore = totalDecisions > 0 ? brierSum / totalDecisions : 0;
    const avgConfidence = totalDecisions > 0 ? confSum / totalDecisions : 0;

    return {
      totalDecisions,
      accuracy,
      precisionBuy,
      recallBuy,
      f1Buy,
      winRate,
      lossRate,
      avgConfidence,
      brierScore,
      profitFactor,
      expectancy,
      maxDrawdown,
      failuresByCategory,
      regimePerformance
    };
  }
}
