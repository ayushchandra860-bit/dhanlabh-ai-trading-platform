const fs = require('fs');

const pathDE = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/engines/DecisionEngine.ts";
let dContent = fs.readFileSync(pathDE, 'utf-8');

// The replace tool accidentally deleted a big chunk. I'll just write the entire method body from the start.
// Let's just fix it. I will restore it by replacing the whole method since the file is broken.

const restoreBlock = `
      { label: 'Risk Acceptable', ok: riskLevel < 65 }
    ];
    
    const isTradeAllowed = (signal === 'BUY' || signal === 'SELL') && checklist.every(c => c.ok);

    const aiDecisionData: AIDecisionData = {
      id: \`AIDecision-\${timestamp}\`,
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
      summary: \`\${signal}: score \${tradeScore}/100, confidence \${confidence}%, risk \${riskLevel}%.\`,
      reasoning: null,
      recommendedExpiry,
      entryRecommendation,
      nearestDanger,
    };
    
    this.lastAIDecisionData = aiDecisionData;
    return aiDecisionData;
  }
`;

// we find where it says `bearishPercentage,\n      riskLevel,\n      timestamp,`
// and prepend the missing lines.
dContent = dContent.replace(/      bearishPercentage,\n      riskLevel,\n      timestamp,/, restoreBlock.substring(restoreBlock.indexOf("      bearishPercentage,")));
// wait, let me just fix the whole method from { label: 'Candle Confirmed' to return aiDecisionData; }

let fullFix = fs.readFileSync(pathDE, 'utf-8');
const searchStr = "      { label: 'Candle Confirmed', ok: priceActionData?.latestPattern !== null && priceActionData.latestPattern.confidence > 60 },\n      bearishPercentage,\n      riskLevel,\n      timestamp,";
if (fullFix.includes(searchStr)) {
    fullFix = fullFix.replace(searchStr, "      { label: 'Candle Confirmed', ok: priceActionData?.latestPattern !== null && priceActionData.latestPattern.confidence > 60 },\n" + restoreBlock.trim());
}

fs.writeFileSync(pathDE, fullFix);
console.log("Restored DecisionEngine.");
