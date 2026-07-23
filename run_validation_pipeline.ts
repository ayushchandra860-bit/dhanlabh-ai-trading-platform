import { Candle } from './electron/main/mars/vision';
import { initMars } from './electron/main/mars';
import { DecisionLogger } from './electron/main/mars/pipeline/validation/DecisionLogger';
import { HistoricalReplayEngine } from './electron/main/mars/pipeline/validation/HistoricalReplayEngine';
import { FailureAnalyzer } from './electron/main/mars/pipeline/validation/FailureAnalyzer';
import { ReliabilityTester } from './electron/main/mars/pipeline/validation/ReliabilityTester';
import { ValidationReporter } from './electron/main/mars/pipeline/validation/ValidationReporter';
import { LoggerService } from './electron/main/LoggerService';
import path from 'path';

async function runValidationPipeline() {
  LoggerService.info('==================================================');
  LoggerService.info('MARS V2.1 STATISTICAL VALIDATION PIPELINE STARTED');
  LoggerService.info('==================================================');

  // 1. Initialize MARS
  await initMars();

  // 2. Mock a historical dataset (e.g., 500 candles of trending and chopping data)
  const dataset: Candle[] = [];
  let price = 100.0;
  for (let i = 0; i < 500; i++) {
    // Generate some wave patterns
    const move = Math.sin(i / 10) * 2 + (Math.random() - 0.5) * 1.5;
    const open = price;
    price += move;
    const close = price;
    const high = Math.max(open, close) + Math.random();
    const low = Math.min(open, close) - Math.random();
    
    dataset.push({
      timestamp: Date.now() - (500 - i) * 60000,
      open, high, low, close,
      direction: close >= open ? 'bullish' : 'bearish',
      bodySize: Math.abs(close - open),
      upperWickLength: high - Math.max(open, close),
      lowerWickLength: Math.min(open, close) - low,
      totalHeight: high - low
    });
  }

  const logger = new DecisionLogger();
  const replayEngine = new HistoricalReplayEngine(logger);
  const failureAnalyzer = new FailureAnalyzer();
  const reliabilityTester = new ReliabilityTester(logger);
  const reporter = new ValidationReporter();

  // Phase 1: Pure Historical Replay (Clean Data)
  LoggerService.info('--- Phase 1: Clean Historical Replay ---');
  await replayEngine.replay(dataset, { windowSize: 50 });
  
  // Phase 3: Failure Analysis
  failureAnalyzer.analyze(logger.getLogs(), dataset, 5); // 5 candle lookahead

  // Phase 4/7: Dashboard Reporting
  const cleanReportPath = path.join(__dirname, 'validation_dashboard_clean.md');
  reporter.generateReport(logger.getLogs(), cleanReportPath);

  // Phase 5: Reliability Testing (Stress Test)
  await reliabilityTester.runStressTests(dataset);
  
  // Analyze stress test logs
  failureAnalyzer.analyze(logger.getLogs(), dataset, 5);
  
  const stressReportPath = path.join(__dirname, 'validation_dashboard_stress.md');
  reporter.generateReport(logger.getLogs(), stressReportPath);

  LoggerService.info('==================================================');
  LoggerService.info('VALIDATION PIPELINE COMPLETE');
  LoggerService.info('==================================================');
}

runValidationPipeline().catch(console.error);
