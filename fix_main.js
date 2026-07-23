const fs = require('fs');
const pathFile = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/main.ts";
let m = fs.readFileSync(pathFile, 'utf-8');

const replacement = `let aiEngineInterval: NodeJS.Timeout | null = null;

// Signal confirmation — prevents flip-flopping
// A signal only pushes to the overlay when the SAME decision repeats N times in a row.
const SIGNAL_CONFIRM_COUNT = 3;      // require 3 consecutive identical signals
let   signalConfirmBuffer: string[] = [];
let   lastConfirmedDecision: string  = '';
let   lastConfirmedDecisionData: any = null;
let   lastVisionResult: any = null;

function startAI(): { state: AIEngineState; running: boolean; updatedAt: number } {
  if (aiEngineState === 'RUNNING' || aiEngineState === 'STARTING') {
    return { state: aiEngineState, running: isAiRunning, updatedAt: Date.now() };
  }
  signalConfirmBuffer = [];
`;

// I'll replace everything from `lastConfirmedDecision = '';\n  setAIState('STARTING'` up to `broadcastAIStatus();\n  return { state: aiEngineState, running: isAiRunning, updatedAt: Date.now() };\n}`

// No, I'll just write a safer regex.
m = m.replace(/  lastConfirmedDecision = '';\r?\n  setAIState\('STARTING', '\[INFO\] AI engine starting\.'\);/g, replacement + `  lastConfirmedDecision = '';\n  setAIState('STARTING', '[INFO] AI engine starting.');`);

fs.writeFileSync(pathFile, m);
console.log("Restored main.ts");
