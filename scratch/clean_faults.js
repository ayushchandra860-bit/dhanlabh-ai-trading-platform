const fs = require('fs');
const path = require('path');

function searchDir(dir, pattern) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('dist') && !file.includes('.git')) {
        searchDir(fullPath, pattern);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(pattern.toLowerCase())) {
          console.log(`${fullPath}:${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

console.log('--- Searching for FAULT ---');
searchDir('c:/Users/ayush/Documents/Dhanlabh V2/electron', 'fault');
searchDir('c:/Users/ayush/Documents/Dhanlabh V2/frontend', 'fault');

console.log('--- Searching for HANG ---');
searchDir('c:/Users/ayush/Documents/Dhanlabh V2/electron', 'hang');

console.log('--- Searching for UNCAUGHT / REJECT ---');
searchDir('c:/Users/ayush/Documents/Dhanlabh V2/electron', 'uncaught');
