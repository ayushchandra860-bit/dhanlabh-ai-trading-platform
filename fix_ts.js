const fs = require('fs');

// 1. main.ts
const pathMain = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/main.ts";
let m = fs.readFileSync(pathMain, 'utf-8');
m = m.replace('let lastConfirmedDecision: AIDecisionData | null = null;', 'let lastConfirmedDecisionData: AIDecisionData | null = null;\nlet lastVisionResult: VisionResult | null = null;');
fs.writeFileSync(pathMain, m);

// 2. SignalCaptureService.ts
const pathSig = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/SignalCaptureService.ts";
let sig = fs.readFileSync(pathSig, 'utf-8');
sig = sig.replace(/visionResult\.aiDecisionData\?.decision/g, "visionResult.aiDecisionData?.signal");
fs.writeFileSync(pathSig, sig);

// 3. VisionManager.ts
const pathVM = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/VisionManager.ts";
let vm = fs.readFileSync(pathVM, 'utf-8');
vm = vm.replace(/decision: 'WAIT'/g, "signal: 'WAIT'");
fs.writeFileSync(pathVM, vm);

// 4. SupportResistanceEngine.ts
const pathSR = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/engines/SupportResistanceEngine.ts";
let sr = fs.readFileSync(pathSR, 'utf-8');
// Fix possible nulls
sr = sr.replace(/a\.price \- b\.price/g, "(a.price ?? 0) - (b.price ?? 0)");
sr = sr.replace(/a\.price \- resistance\.price/g, "(a.price ?? 0) - (resistance.price ?? 0)");
sr = sr.replace(/b\.price \- support\.price/g, "(b.price ?? 0) - (support.price ?? 0)");
sr = sr.replace(/support\.price < /g, "(support.price ?? 0) < ");
sr = sr.replace(/resistance\.price > /g, "(resistance.price ?? 0) > ");
sr = sr.replace(/const distance = Math\.abs\(currentPriceY \- support\.price\);/g, "const distance = Math.abs(currentPriceY - (support.price ?? 0));");
sr = sr.replace(/const distance = Math\.abs\(currentPriceY \- resistance\.price\);/g, "const distance = Math.abs(currentPriceY - (resistance.price ?? 0));");

fs.writeFileSync(pathSR, sr);
console.log("Fixed ts errors.");
