const fs = require('fs');
const filepath = "c:/Users/ayush/Documents/Dhanlabh V2/frontend/src/hooks/useOverlayData.ts";
let content = fs.readFileSync(filepath, 'utf-8');

content = content.replace("const sig = decision?.decision;", "const sig = decision?.signal;");

fs.writeFileSync(filepath, content);
console.log("Fixed sig reference");
