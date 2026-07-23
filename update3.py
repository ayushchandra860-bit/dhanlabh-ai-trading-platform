import re

filepath = r"c:\\Users\\ayush\\Documents\\Dhanlabh V2\\electron\\main\\VisionManager.ts"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

reason_pattern = r"(LoggerService\.info\('VisionManager: Starting AI Reason Generator\.'\);.*?)(?=\n  /\*\*\n   \* Calculates the absolute screen coordinates)"
reason_match = re.search(reason_pattern, content, re.DOTALL)

if reason_match:
    old_reason_body = reason_match.group(1)
    new_reason_body = """LoggerService.info('VisionManager: Starting AI Reason Generator.');
    const timestamp = Date.now();
    const positiveReasons: AIReason[] = [];
    const negativeReasons: AIReason[] = [];
    const direction = aiDecisionData.signal === 'BUY' ? 'bullish' : (aiDecisionData.signal === 'SELL' ? 'bearish' : 'neutral');
    
    const addReason = (isPositive: boolean, category: ReasonCategory, description: string, confidence: number, moduleName: string, evidence: string): void => {
      const reason: AIReason = {
        id: this._generateReasonId(category, description, timestamp + positiveReasons.length + negativeReasons.length),
        decisionId: aiDecisionData.id,
        priority: ReasonPriority.Primary,
        category,
        description,
        moduleName,
        evidence,
        confidence: this._clampScore(confidence),
        timestamp,
      };
      if (isPositive) positiveReasons.push(reason);
      else negativeReasons.push(reason);
    };

    if (aiDecisionData.signal !== 'WAIT' && aiDecisionData.signal !== 'ANALYZING' && aiDecisionData.signal !== 'NO SIGNAL' && aiDecisionData.signal !== 'LOW CONFIDENCE') {
        if (tradeScoreData) addReason(true, ReasonCategory.TradeScore, Trade score is strong at /100., tradeScoreData.confidence, 'TradeScoringEngine', Score derived from );
        if (confluenceData && confluenceData.confluenceScore > 60) addReason(true, ReasonCategory.SMCConfluence, Confluence alignment confirmed., confluenceData.confidence, 'ConfluenceEngine', confluenceData.reasonSummary);
        if (trendData?.currentTrend && direction !== 'neutral') {
            const isTrendAligned = (direction === 'bullish' && this._isBullishTrend(trendData.currentTrend.direction)) || (direction === 'bearish' && this._isBearishTrend(trendData.currentTrend.direction));
            if (isTrendAligned) addReason(true, ReasonCategory.Trend, Trend is ., trendData.currentTrend.confidence, 'TrendDetectionEngine', Momentum score is );
        }
        if (priceActionData?.latestPattern) {
            const isPaAligned = priceActionData.latestPattern.direction === direction;
            addReason(isPaAligned, ReasonCategory.PriceAction, Pattern  detected., priceActionData.latestPattern.confidence, 'PriceActionEngine', Pattern quality is /100);
        }
        if (liquidityData?.latestSweep) {
            const isLiqAligned = liquidityData.latestSweep.direction === direction;
            addReason(isLiqAligned, ReasonCategory.Liquidity, Liquidity swept at ., liquidityData.latestSweep.confidence, 'LiquidityEngine', Rejection strength is /100);
        }
        if (aiDecisionData.riskLevel > 50) {
            addReason(false, ReasonCategory.RiskManagement, Elevated risk level (/100)., 100, 'RiskEngine', Volatility and fake breakout probabilities are high);
        }
    } else {
        if (aiDecisionData.riskLevel > 70) addReason(false, ReasonCategory.RiskManagement, Market risk is too high., 90, 'RiskEngine', Risk score /100 exceeds safety threshold);
        if (confluenceData && confluenceData.confluenceScore < 40) addReason(false, ReasonCategory.SMCConfluence, Lack of confluence., 80, 'ConfluenceEngine', Confluence score /100 is below minimum threshold);
    }

    const riskExplanation = Risk is /100; retail trap /100 and fake breakout /100.;
    const confidenceExplanation = Decision confidence is % from trade score /100, confluence /100, and engine confidence %.;
    const institutionalSummary = Institutional bias is ; bullish % versus bearish %.;
    const retailWarning = aiDecisionData.riskLevel >= 70
      ? 'High risk context: wait for cleaner confirmation or avoid chasing the move.'
      : 'Risk context is acceptable if execution remains aligned with the detected levels.';
    const marketSummary = Current price Y ; structure , trend , latest pattern .;
    
    return {
      decisionSummary: ${aiDecisionData.signal}: ,
      positiveReasons,
      negativeReasons,
      riskExplanation,
      confidenceExplanation,
      institutionalSummary,
      retailWarning,
      marketSummary,
    };
  }
"""
    content = content.replace(old_reason_body, new_reason_body)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished rewrite 3")
