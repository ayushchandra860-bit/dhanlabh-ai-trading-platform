const fs = require('fs');
const path = require('path');

const pathDE = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/engines/DecisionEngine.ts";
let de = fs.readFileSync(pathDE, 'utf-8');

de = de.replace(/priceActionData\.latestPattern\.confidence/g, "priceActionData?.latestPattern?.confidence");
de = de.replace(/priceActionData\.latestPattern\.patternQuality/g, "priceActionData?.latestPattern?.patternQuality");
de = de.replace(/supportResistanceData\.nearestSupport\.distanceFromCurrentPrice/g, "supportResistanceData?.nearestSupport?.distanceFromCurrentPrice");
de = de.replace(/supportResistanceData\.nearestResistance\.distanceFromCurrentPrice/g, "supportResistanceData?.nearestResistance?.distanceFromCurrentPrice");

fs.writeFileSync(pathDE, de);

// Also let's check ReasoningEngine for similar issues
const pathRE = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/engines/ReasoningEngine.ts";
let re = fs.readFileSync(pathRE, 'utf-8');
re = re.replace(/priceActionData\.latestPattern\.direction/g, "priceActionData?.latestPattern?.direction");
re = re.replace(/liquidityData\.latestSweep\.direction/g, "liquidityData?.latestSweep?.direction");

fs.writeFileSync(pathRE, re);

console.log("Fixed null reference bugs in DecisionEngine and ReasoningEngine.");
