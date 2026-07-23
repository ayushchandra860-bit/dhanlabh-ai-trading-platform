const fs = require('fs');
const filepath = "c:/Users/ayush/Documents/Dhanlabh V2/frontend/src/pages/Overlay.tsx";
let content = fs.readFileSync(filepath, 'utf-8');

content = content.replace(/className=\{ol-signal-badge \}/g, 'className={`ol-signal-badge ${sigClass}`}');
content = content.replace(/className=\{ol-data-value \}/g, 'className={`ol-data-value ${riskClass}`}');
content = content.replace(/className=\{ol-entry-badge \}/g, 'className={`ol-entry-badge ${entryClass}`}');
content = content.replace(/className=\{ol-trade-allowed \}/g, 'className={`ol-trade-allowed ${decision?.isTradeAllowed ? "yes" : "no"}`}');

fs.writeFileSync(filepath, content);
console.log("Fixed classNames properly");
