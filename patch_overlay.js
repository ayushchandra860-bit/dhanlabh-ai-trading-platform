const fs = require('fs');
const pathFile = "c:/Users/ayush/Documents/Dhanlabh V2/frontend/src/pages/Overlay.tsx";
let m = fs.readFileSync(pathFile, 'utf-8');
m = m.replace(/const sig\s*=\s*decision\?\.decision \?\? 'WAIT';/g, "const sig = decision?.signal ?? 'WAIT';");
fs.writeFileSync(pathFile, m);
console.log("Patched Overlay.tsx to use decision?.signal");
