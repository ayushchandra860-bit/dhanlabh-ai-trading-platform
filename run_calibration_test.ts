import { CalibrationFramework } from './electron/main/mars/pipeline/calibration/CalibrationFramework';
import { HistoricalRecord } from './electron/main/mars/pipeline/calibration/CalibrationDatasetValidator';
import { LoggerService } from './electron/main/LoggerService';

async function runTest() {
  LoggerService.info('--- Starting Calibration Framework Test ---');
  
  const framework = new CalibrationFramework('./test_calibration_profiles.json');
  
  // Create mock dataset
  const dataset: HistoricalRecord[] = [];
  
  // Add 100 mock records to pass the validation (min 50)
  for (let i = 0; i < 100; i++) {
    const outcome = i % 2 === 0 ? 'CONTINUATION' : 'REVERSAL';
    dataset.push({
      hypothesis: {
        id: `h${i}`,
        contextId: `c${i}`,
        prediction: 'CONTINUATION',
        confidence: 60,
        expectedOutcome: i % 2 === 0 ? 'Expect CONTINUATION due to HIGH_VOLATILITY_TREND' : 'Expect CONTINUATION due to LOW_VOLATILITY_RANGE'
      },
      actualOutcome: outcome,
      timestamp: Date.now() - (100 - i) * 60000, // 1 min apart
      dataQualityScore: 90
    });
  }

  // Run Calibration Session
  const report = framework.runCalibrationSession(dataset);
  
  if (report) {
    LoggerService.info('Report generated successfully!');
    LoggerService.info(report.reportMarkdown);
    
    // Simulate user approving the candidate
    framework.approveAndActivateCandidate(report.candidateProfileId);
    
    const active = framework.configManager.getActiveProfile();
    LoggerService.info(`Active profile is now: ${active.id}`);
    
    // Simulate rollback
    framework.rollback('default-production');
    
    const rolledBack = framework.configManager.getActiveProfile();
    LoggerService.info(`Active profile rolled back to: ${rolledBack.id}`);
    
  } else {
    LoggerService.error('Calibration session failed to generate report.');
  }
}

runTest().catch(console.error);
