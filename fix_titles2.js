const fs = require('fs');
const filepath = "c:/Users/ayush/Documents/Dhanlabh V2/frontend/src/pages/Overlay.tsx";
let content = fs.readFileSync(filepath, 'utf-8');

content = content.replace(/title=\{\$\{r\.moduleName\} - \}/g, "title={`${r.moduleName} - ${r.evidence}`}");
fs.writeFileSync(filepath, content);
console.log("Fixed titles correctly");
