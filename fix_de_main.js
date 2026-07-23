const fs = require('fs');

// 1. Fix DecisionEngine.ts
const pathDE = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/engines/DecisionEngine.ts";
let dContent = fs.readFileSync(pathDE, 'utf-8');

dContent = dContent.replace(/id:  iDecision-,/g, 'id: `AIDecision-${timestamp}`,');
dContent = dContent.replace(/summary: \$\{signal\}: score \/100, confidence %, risk %\.,/g, 'summary: `${signal}: score ${tradeScore}/100, confidence ${confidence}%, risk ${riskLevel}%.`,');

fs.writeFileSync(pathDE, dContent);

// 2. Fix main.ts
const pathMain = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/main.ts";
let mContent = fs.readFileSync(pathMain, 'utf-8');

mContent = mContent.replace(/updateReason = Signal state changed from  to ;/g, 'updateReason = `Signal state changed from ${lastSignal} to ${currentSignal}`;');
mContent = mContent.replace(/updateReason = Confidence changed significantly;/g, 'updateReason = `Confidence changed significantly`;');
mContent = mContent.replace(/updateReason = Risk level changed significantly;/g, 'updateReason = `Risk level changed significantly`;');
mContent = mContent.replace(/updateReason = Support or Resistance level changed;/g, 'updateReason = `Support or Resistance level changed`;');
mContent = mContent.replace(/appendLog\(\[OVERLAY UPDATE\] \. Signal: \);/g, 'appendLog(`[OVERLAY UPDATE] ${updateReason}. Signal: ${currentSignal}`);');
mContent = mContent.replace(/catch \(error\) \{/g, 'catch (error) {'); // wait, the error was "try expected"

// Wait, the "try expected" error is around line 201 in main.ts
// Let's print out lines 190 to 220 of main.ts before replacing it
console.log("Fixed DE and partial Main. Let's look at try-catch in main.ts");
