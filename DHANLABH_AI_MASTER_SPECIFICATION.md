# DHANLABH AI
## Master Specification Document (MSD)
Status: LOCKED

> **IMPORTANT PROJECT RULE**
> This document is the single source of truth for the project. No implementation may contradict this specification. If a new feature is required, update this specification first. Only after approval should implementation begin. Do not make architectural, UI, UX, or AI logic decisions that are not explicitly defined here. When uncertain, ask for clarification instead of making assumptions.
**Mission**
DhanLabh AI is a real-time AI Market Analysis System.
Its purpose is NOT to blindly predict the market.
Its purpose is to:
- Observe the chart
- Understand market structure
- Detect opportunities
- Detect risks
- Explain every decision
- Assist the trader

The AI must always explain WHY before recommending WHAT.

### 2. Core Philosophy
The AI must never:
- Guess
- Fabricate
- Hallucinate
- Force BUY/SELL

If data is insufficient:
Output `WAIT` or `LOW CONFIDENCE` instead of inventing a signal.

### 3. AI Pipeline
Screen Capture -> Chart Detection -> OCR -> Vision Processing -> Market Understanding -> AI Analysis -> Decision Engine -> Reasoning Engine -> Overlay

### 4. Module Architecture
**Layer 1: Screen Capture Engine**
- Responsibilities: Capture broker window, Crop chart, Detect window changes
- Output: Frame, Timestamp, Resolution

**Layer 2: Chart Detection Engine**
- Detect: Chart region, Price axis, Time axis, Candle area, Indicator area
- Confidence required: 95%

**Layer 3: OCR Engine**
- Extract: Current price, Asset, Payout, Time, Expiry, Account mode
- Every OCR result must contain: Text, Confidence, Bounding Box

**Layer 4: Candle Engine**
- Recognize: Bullish, Bearish, Doji, Hammer, Engulfing, Pin Bar, Morning Star, Evening Star
- Output: Pattern, Confidence, Location

**Layer 5: Trend Engine**
- States: Strong Bullish, Bullish, Neutral, Bearish, Strong Bearish
- Return: Trend, Confidence, Slope, Strength

**Layer 6: Support Engine**
- Return: Nearest Support, Price, Distance, Reaction Count, Strength, Break Probability

**Layer 7: Resistance Engine**
- Return: Nearest Resistance, Price, Distance, Reaction Count, Strength, Break Probability

**Layer 8: Liquidity Engine**
- Detect: Liquidity Sweep, Equal High, Equal Low, Stop Hunt, Liquidity Pool

**Layer 9: Market Structure Engine**
- Detect: HH, HL, LH, LL, BOS, CHOCH

**Layer 10: Momentum Engine**
- Return: Acceleration, Deceleration, Exhaustion, Strength

**Layer 11: Volatility Engine**
- Return: ATR, Volatility, Noise, Expected Move

**Layer 12: Risk Engine**
- Return: Risk Level, Late Entry Risk, Breakout Risk, Fakeout Risk, Volatility Risk

**Layer 13: Opportunity Engine**
- Return: Trade Score, Entry Quality, Recommended Expiry, Risk Reward, Expected Win Rate (only if statistically justified)
*Note: Do not display a "win rate" unless it is based on real historical evaluation. Avoid inventing probability figures.*

**Layer 14: Confluence Engine**
- Collect: Trend, Momentum, Structure, Liquidity, Support, Resistance, Candle Pattern, Risk
- Return: Confluence Score

**Layer 15: Decision Engine**
- Possible Outputs: BUY, SELL, WAIT, NO SIGNAL, LOW CONFIDENCE, ANALYZING
- Rules: Never force BUY, Never force SELL, WAIT is acceptable.

**Layer 16: Reasoning Engine**
- Every statement must reference a real module.
- Positive: Support Holding, Bullish Engulfing, Trend Aligned, Liquidity Sweep Complete
- Negative: Resistance Close, Weak Momentum, Risk High, Fake Breakout Possible
- Every reason: Description, Evidence, Confidence, Module Source

**Layer 17: Confidence Engine**
- Confidence is NOT OCR confidence.
- Confidence comes from: Trend, Pattern, Momentum, Confluence, Risk
- Return: 0-100%

**Layer 18: Signal History Engine**
- Store: Signal, Confidence, Trade Score, Timestamp, Market Snapshot, Outcome (when known)

**Layer 19: Overlay Renderer**
- Render ONLY. No calculations. No logic. No guessing.

### 5. Overlay Information Architecture
**LEFT**
- AI Signal, Confidence, Trade Score, Risk Level, Recommended Expiry, Entry Recommendation

**RIGHT**
- Support, Support Strength, Support Distance
- Resistance, Resistance Strength, Resistance Distance
- Why Take Trade, Why Avoid Trade, Nearest Danger, Checklist, Trade Allowed

**BOTTOM**
- Recent Signals, AI Reason Summary

### 6. Engineering Rules
- **Rule 1**: Frontend performs ZERO trading calculations.
- **Rule 2**: Every displayed value originates from backend.
- **Rule 3**: Never fabricate values. If unavailable: Calculating..., Not Available, Low Confidence
- **Rule 4**: Every AI statement must be explainable.
- **Rule 5**: Every module must be independently testable.
- **Rule 6**: VisionManager is an orchestrator only.
- **Rule 7**: Every decision must be reproducible from logs.

### 7. Logging
Every analysis stores: Timestamp, OCR Output, Detected Candles, Trend, Support, Resistance, Liquidity, Risk, Confluence, Decision, Reasons

### 8. Performance Targets
- Analysis cycle: <=300 ms preferred, <=500 ms acceptable
- Overlay refresh: Smooth, only when new validated data is available.

### 9. Future Roadmap
- **Version 1**: OCR, Vision, Support/Resistance, Decision, Overlay
- **Version 2**: Multi-timeframe analysis, Session awareness, Adaptive calibration
- **Version 3**: Learning engine, Strategy profiles, Performance analytics, Trade journal integration

### 10. Golden Rule
The AI exists to reduce uncertainty, not to create false certainty. Every recommendation must be backed by measurable evidence, and when evidence is insufficient, the correct answer is to wait.
