import re

filepath = r"c:\\Users\\ayush\\Documents\\Dhanlabh V2\\electron\\main\\VisionManager.ts"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

make_decision_pattern = r"(LoggerService\.info\('VisionManager: Starting AI BUY / SELL Decision Engine\.'\);.*?)(?=\n  /\*\*\n   \* Implements a REAL AI Reason Generator\.)"
make_decision_match = re.search(make_decision_pattern, content, re.DOTALL)

if make_decision_match:
    old_body = make_decision_match.group(1)
    new_body = """LoggerService.info('VisionManager: Starting AI BUY / SELL Decision Engine.');
    const timestamp = Date.now();
    
    const isChartValid = candles !== null && candles.length > 0 && currentPriceY !== null;
    const isOCRValid = ocrResult !== null && (ocrResult.confidence === null || ocrResult.confidence >= 40);
    const isRiskComplete = tradeScoreData !== null;
    const isModulesComplete = confluenceData !== null;
    const confluenceScore = confluenceData?.confluenceScore ?? 0;
    
    let signal: AIDecisionType = 'WAIT';
    if (!isChartValid || !isOCRValid) signal = 'ANALYZING';
    else if (!isRiskComplete || !isModulesComplete) signal = 'ANALYZING';
    else if (confluenceScore < 40) signal = 'LOW CONFIDENCE';
    
    const tradeScore = tradeScoreData?.overallScore ?? 0;
    const bullishPercentage = tradeScoreData?.bullishPercentage ?? 0;
    const bearishPercentage = tradeScoreData?.bearishPercentage ?? 0;
    const riskLevel = tradeScoreData?.riskScore ?? 100;
    const confidenceBase = this._average([tradeScoreData?.confidence ?? 0, confluenceData?.confidence ?? 0]);
    const bias = confluenceData?.institutionalBias ?? 'undefined';
    
    if (signal === 'WAIT') {
        const bullishSetup = bullishPercentage >= bearishPercentage + 8 && bias !== 'bearish';
        const bearishSetup = bearishPercentage >= bullishPercentage + 8 && bias !== 'bullish';
        const strongScore = tradeScore >= 68 && riskLevel <= 55;
        
        if (strongScore && bullishSetup) signal = 'BUY';
        else if (strongScore && bearishSetup) signal = 'SELL';
        else if (tradeScore < 35 || riskLevel >= 82) signal = 'NO SIGNAL';
    }

    const directionQuality = signal === 'BUY'
      ? this._average([
        orderBlockData?.nearestBullishOrderBlock?.retestProbability ?? 0,
        fvgData?.nearestBullishFVG?.expectedReactionStrength ?? 0,
        supportResistanceData?.nearestSupport ? this._distanceQuality(supportResistanceData.nearestSupport.distanceFromCurrentPrice ?? 0, trendData?.currentTrend?.averageCandleSize ?? 1) : 0,
        priceActionData?.latestPattern?.direction === 'bullish' ? priceActionData.latestPattern.patternQuality : 0,
      ])
      : (signal === 'SELL'
        ? this._average([
          orderBlockData?.nearestBearishOrderBlock?.retestProbability ?? 0,
          fvgData?.nearestBearishFVG?.expectedReactionStrength ?? 0,
          supportResistanceData?.nearestResistance ? this._distanceQuality(supportResistanceData.nearestResistance.distanceFromCurrentPrice ?? 0, trendData?.currentTrend?.averageCandleSize ?? 1) : 0,
          priceActionData?.latestPattern?.direction === 'bearish' ? priceActionData.latestPattern.patternQuality : 0,
        ])
        : tradeScore * 0.5);
        
    const expectedSuccessProbability = this._clampScore(tradeScore * 0.55 + confidenceBase * 0.25 + (100 - riskLevel) * 0.2);
    const structureConfirmation = signal === 'BUY'
      ? (bosChochData?.latestBOS?.direction === 'bullish' || bosChochData?.latestCHOCH?.direction === 'bullish' ? 100 : 0)
      : (signal === 'SELL'
        ? (bosChochData?.latestBOS?.direction === 'bearish' || bosChochData?.latestCHOCH?.direction === 'bearish' ? 100 : 0)
        : 0);
    const entryQuality = this._clampScore(directionQuality * 0.62 + (marketStructureData?.structureConfidence ?? 0) * 0.13 + (liquidityData?.latestSweep?.rejectionStrength ?? 0) * 0.13 + structureConfirmation * 0.12);
    
    const confidence = this._clampScore(confidenceBase * 0.45 + Math.abs(bullishPercentage - bearishPercentage) * 0.35 + (100 - riskLevel) * 0.2);
    
    let recommendedExpiry = 'WAIT';
    if (signal === 'BUY' || signal === 'SELL') {
      recommendedExpiry = (riskLevel < 50 && entryQuality > 70) ? '3 MINUTES' : '1 MINUTE';
    }
    
    let entryRecommendation: 'YES' | 'NO' | 'WAIT' = 'WAIT';
    if (signal === 'BUY' || signal === 'SELL') entryRecommendation = 'YES';
    else if (signal === 'NO SIGNAL') entryRecommendation = 'NO';
    
    let nearestDanger = 'None';
    const avgCandle = trendData?.currentTrend?.averageCandleSize ?? 20;
    if (signal === 'BUY' && supportResistanceData?.nearestResistance) {
      if ((supportResistanceData.nearestResistance.distanceFromCurrentPrice ?? 100) < avgCandle * 2) {
        nearestDanger = 'Resistance too close';
      }
    } else if (signal === 'SELL' && supportResistanceData?.nearestSupport) {
      if ((supportResistanceData.nearestSupport.distanceFromCurrentPrice ?? 100) < avgCandle * 2) {
        nearestDanger = 'Support too close';
      }
    }
    if (riskLevel > 75) nearestDanger = 'High market volatility / Trap risk';

    const checklist = [
      { label: 'Support Safe', ok: signal === 'BUY' ? (supportResistanceData?.nearestSupport !== null && (supportResistanceData.nearestSupport.distanceFromCurrentPrice ?? 100) > avgCandle * 1.5) : true },
      { label: 'Resistance Safe', ok: signal === 'SELL' ? (supportResistanceData?.nearestResistance !== null && (supportResistanceData.nearestResistance.distanceFromCurrentPrice ?? 100) > avgCandle * 1.5) : true },
      { label: 'Liquidity Confirmed', ok: liquidityData?.latestSweep !== null },
      { label: 'Candle Confirmed', ok: priceActionData?.latestPattern !== null && priceActionData.latestPattern.confidence > 60 },
      { label: 'Risk Acceptable', ok: riskLevel < 65 }
    ];
    
    const isTradeAllowed = (signal === 'BUY' || signal === 'SELL') && checklist.every(c => c.ok);

    const aiDecisionData: AIDecisionData = {
      id: iDecision-,
      signal,
      checklist,
      isTradeAllowed,
      confidence,
      tradeScore,
      bullishPercentage,
      bearishPercentage,
      riskLevel,
      timestamp,
      institutionalBias: bias,
      expectedSuccessProbability,
      entryQuality,
      summary: ${signal}: score /100, confidence %, risk %.,
      reasoning: null,
      recommendedExpiry,
      entryRecommendation,
      nearestDanger,
    };
    
    this._lastAIDecisionData = aiDecisionData;
    return aiDecisionData;
  }
"""
    content = content.replace(old_body, new_body)
    
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished rewrite 2")
