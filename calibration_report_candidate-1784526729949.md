
# MARS Calibration Report
**Date:** 2026-07-20T05:52:09.956Z
**Base Profile:** `default-production` (v1.0.0)
**Candidate Profile:** `candidate-1784526729949` (v1.0.0-beta)

## Walk-Forward Validation Results
| Metric | Production | Candidate | Delta |
|--------|------------|-----------|-------|
| Sample Size | 100 | 30 | - |
| Win Rate | 50.00% | 50.00% | 0.00% |
| Brier Score | 0.2312 | 0.2162 | -0.0150 |

## Parameter Diff
*Only showing changed parameters:*
```diff
- id: default-production
+ id: candidate-1784526729949
- version: 1.0.0
+ version: 1.0.0-beta
- description: Factory default MARS calibration profile
+ description: Candidate profile generated via deterministic optimization from default-production
- thresholds.chaosRegimeCap: 0.6
+ thresholds.chaosRegimeCap: 0.5
No parameters were changed.- regimes.highVolTrendConfidence: 80
+ regimes.highVolTrendConfidence: 90

```

## Recommendation
> [!TIP]
> **Approve:** Candidate profile demonstrates improved accuracy and calibration on out-of-sample data.
