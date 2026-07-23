import { CalibrationProfile, CalibrationMetrics } from './CalibrationTypes';
import { LoggerService } from '../../../LoggerService';

export interface CalibrationReport {
  timestamp: number;
  baseProfileId: string;
  candidateProfileId: string;
  reportMarkdown: string;
}

export class CalibrationReporter {

  /**
   * Generates a comparison report between a base production profile and a new candidate profile.
   */
  public generateReport(
    baseProfile: CalibrationProfile,
    baseMetrics: CalibrationMetrics,
    candidateProfile: CalibrationProfile,
    candidateMetrics: CalibrationMetrics
  ): CalibrationReport {
    
    LoggerService.info(`[CalibrationReporter] Generating calibration report for ${candidateProfile.id}`);

    const winRateDelta = (candidateMetrics.winRate - baseMetrics.winRate) * 100;
    const brierDelta = candidateMetrics.brierScore - baseMetrics.brierScore;

    const reportMarkdown = `
# MARS Calibration Report
**Date:** ${new Date().toISOString()}
**Base Profile:** \`${baseProfile.id}\` (v${baseProfile.version})
**Candidate Profile:** \`${candidateProfile.id}\` (v${candidateProfile.version})

## Walk-Forward Validation Results
| Metric | Production | Candidate | Delta |
|--------|------------|-----------|-------|
| Sample Size | ${baseMetrics.sampleSize} | ${candidateMetrics.sampleSize} | - |
| Win Rate | ${(baseMetrics.winRate * 100).toFixed(2)}% | ${(candidateMetrics.winRate * 100).toFixed(2)}% | ${winRateDelta > 0 ? '+' : ''}${winRateDelta.toFixed(2)}% |
| Brier Score | ${baseMetrics.brierScore.toFixed(4)} | ${candidateMetrics.brierScore.toFixed(4)} | ${brierDelta > 0 ? '+' : ''}${brierDelta.toFixed(4)} |

## Parameter Diff
*Only showing changed parameters:*
\`\`\`diff
${this.generateDiff(baseProfile, candidateProfile)}
\`\`\`

## Recommendation
${brierDelta < 0 || winRateDelta > 0 ? '> [!TIP]\n> **Approve:** Candidate profile demonstrates improved accuracy and calibration on out-of-sample data.' : '> [!WARNING]\n> **Reject:** Candidate profile does not improve upon production baseline.'}
`;

    return {
      timestamp: Date.now(),
      baseProfileId: baseProfile.id,
      candidateProfileId: candidateProfile.id,
      reportMarkdown
    };
  }

  private generateDiff(base: any, candidate: any, path: string = ''): string {
    let diff = '';
    for (const key of Object.keys(base)) {
      if (typeof base[key] === 'object' && base[key] !== null) {
        diff += this.generateDiff(base[key], candidate[key], `${path}${key}.`);
      } else {
        if (base[key] !== candidate[key]) {
          diff += `- ${path}${key}: ${base[key]}\n`;
          diff += `+ ${path}${key}: ${candidate[key]}\n`;
        }
      }
    }
    return diff || 'No parameters were changed.';
  }
}
