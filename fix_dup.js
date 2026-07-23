const fs = require('fs');
const pathFile = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/engines/PriceActionEngine.ts";
let m = fs.readFileSync(pathFile, 'utf-8');

m = m.replace(/  private bodySize\(candle: any\): number \{\r?\n    return Math\.abs\(\(candle\.open \?\? 0\) - \(candle\.close \?\? 0\)\);\r?\n  \}\r?\n/g, "");

fs.writeFileSync(pathFile, m);
console.log("Fixed PriceActionEngine.ts");
