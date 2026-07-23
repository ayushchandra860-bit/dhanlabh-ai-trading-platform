const fs = require('fs');

// 1. Fix ReasoningEngine.ts
const pathReas = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/engines/ReasoningEngine.ts";
let rContent = fs.readFileSync(pathReas, 'utf-8');

rContent = rContent.replace(/Trade score is strong at \/100\./g, "`Trade score is strong at ${tradeScoreData.overallScore}/100.`");
rContent = rContent.replace(/Score derived from /g, "`Score derived from ${tradeScoreData.bullishPercentage}% bullish vs ${tradeScoreData.bearishPercentage}% bearish factors`");
rContent = rContent.replace(/Confluence alignment confirmed\./g, "`Confluence alignment confirmed.`");
rContent = rContent.replace(/Trend is \./g, "`Trend is ${trendData.currentTrend.direction}.`");
rContent = rContent.replace(/Momentum score is /g, "`Momentum score is ${trendData.currentTrend.momentumScore}/100`");
rContent = rContent.replace(/Pattern  detected\./g, "`Pattern ${priceActionData.latestPattern.type} detected.`");
rContent = rContent.replace(/Pattern quality is \/100/g, "`Pattern quality is ${priceActionData.latestPattern.quality}/100`");
rContent = rContent.replace(/Liquidity swept at \./g, "`Liquidity swept at ${liquidityData.latestSweep.levelId}.`");
rContent = rContent.replace(/Rejection strength is \/100/g, "`Rejection strength is ${liquidityData.latestSweep.rejectionStrength}/100`");
rContent = rContent.replace(/Elevated risk level \(\/100\)\./g, "`Elevated risk level (${aiDecisionData.riskLevel}/100).`");
rContent = rContent.replace(/Volatility and fake breakout probabilities are high/g, "`Volatility and fake breakout probabilities are high`");
rContent = rContent.replace(/Market risk is too high\./g, "`Market risk is too high.`");
rContent = rContent.replace(/Risk score \/100 exceeds safety threshold/g, "`Risk score ${aiDecisionData.riskLevel}/100 exceeds safety threshold`");
rContent = rContent.replace(/Lack of confluence\./g, "`Lack of confluence.`");
rContent = rContent.replace(/Confluence score \/100 is below minimum threshold/g, "`Confluence score ${confluenceData.confluenceScore}/100 is below minimum threshold`");
rContent = rContent.replace(/Risk is \/100; retail trap \/100 and fake breakout \/100\./g, "`Risk is ${aiDecisionData.riskLevel}/100; retail trap ${tradeScoreData?.retailTrapProbability ?? 0}/100 and fake breakout ${tradeScoreData?.fakeBreakoutProbability ?? 0}/100.`");
rContent = rContent.replace(/Decision confidence is % from trade score \/100, confluence \/100, and engine confidence %\./g, "`Decision confidence is ${aiDecisionData.confidence}% from trade score ${tradeScoreData?.confidence ?? 0}/100, confluence ${confluenceData?.confidence ?? 0}/100, and engine confidence ${aiDecisionData.confidence}%.`");
rContent = rContent.replace(/Institutional bias is ; bullish % versus bearish %\./g, "`Institutional bias is ${confluenceData?.institutionalBias ?? 'neutral'}; bullish ${tradeScoreData?.bullishPercentage ?? 0}% versus bearish ${tradeScoreData?.bearishPercentage ?? 0}%.`");
rContent = rContent.replace(/Current price Y ; structure , trend , latest pattern \./g, "`Current price Y ${currentPriceY}; structure ${marketStructureData?.structureState ?? 'unknown'}, trend ${trendData?.currentTrend?.direction ?? 'unknown'}, latest pattern ${priceActionData?.latestPattern?.type ?? 'none'}.`");
rContent = rContent.replace(/decisionSummary: \$\{aiDecisionData\.signal\}: ,/g, "decisionSummary: `${aiDecisionData.signal}: ${aiDecisionData.signal}`,");

fs.writeFileSync(pathReas, rContent);

// 2. Fix SupportResistanceEngine.ts
const pathSR = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/engines/SupportResistanceEngine.ts";
let sContent = fs.readFileSync(pathSR, 'utf-8');
sContent = sContent.replace(/\\n/g, "");
fs.writeFileSync(pathSR, sContent);

// 3. Fix main.ts syntax errors
const pathMain = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/main.ts";
let mContent = fs.readFileSync(pathMain, 'utf-8');

// I need to find where main.ts is broken
// "electron/main/main.ts(156,33): error TS1005: ';' expected."
// Wait, I will just run eslint or typescript on it to see exactly.

console.log("Fixed ReasoningEngine and SupportResistanceEngine syntax.");
