const fs = require('fs');
const pathMain = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/main.ts";
let m = fs.readFileSync(pathMain, 'utf-8');
m = m.replace(/appendLog\(\`\[ERROR\] AI Engine crashed: \$\{\(error as Error\)\.message\}\`\);/, "console.error('AI Engine crashed:', error);\n    appendLog(`[ERROR] AI Engine crashed: ${(error as Error).message}`);");
fs.writeFileSync(pathMain, m);
console.log("Patched main.ts to log crashes to terminal");
