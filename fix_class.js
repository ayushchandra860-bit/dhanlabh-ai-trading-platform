const fs = require('fs');
const filepath = "c:/Users/ayush/Documents/Dhanlabh V2/frontend/src/pages/Overlay.tsx";
let content = fs.readFileSync(filepath, 'utf-8');

// Fix className lost backticks
content = content.replace(/className=\{ol-signal-badge \$\{sigClass\}\}/g, 'className={`ol-signal-badge ${sigClass}`}');
content = content.replace(/className=\{ol-data-value \$\{riskClass\}\}/g, 'className={`ol-data-value ${riskClass}`}');
content = content.replace(/className=\{ol-entry-badge \$\{entryClass\}\}/g, 'className={`ol-entry-badge ${entryClass}`}');
content = content.replace(/className=\{ol-trade-allowed \$\{decision\.isTradeAllowed \? 'yes' : 'no'\}\}/g, 'className={`ol-trade-allowed ${decision.isTradeAllowed ? "yes" : "no"}`}');

fs.writeFileSync(filepath, content);
console.log("Fixed classNames");
