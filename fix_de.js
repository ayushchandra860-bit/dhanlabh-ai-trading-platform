const fs = require('fs');
const filepath = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/engines/DecisionEngine.ts";
let content = fs.readFileSync(filepath, 'utf-8');

// Add ocrResult to makeAIDecision signature
content = content.replace("candles: Candle[] | null,", "ocrResult: OcrResult | null,\n    candles: Candle[] | null,");

fs.writeFileSync(filepath, content);
console.log("Fixed DecisionEngine.ts");
