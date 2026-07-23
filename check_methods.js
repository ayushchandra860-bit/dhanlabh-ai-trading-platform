const fs = require('fs');
const path = require('path');
const enginesDir = 'c:/Users/ayush/Documents/Dhanlabh V2/electron/main/engines';
const files = fs.readdirSync(enginesDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const content = fs.readFileSync(path.join(enginesDir, file), 'utf-8');
  const methodCalls = new Set();
  
  let match;
  const regex = /this\.([a-zA-Z0-9_]+)\(/g;
  while ((match = regex.exec(content)) !== null) {
    methodCalls.add(match[1]);
  }
  
  const missing = Array.from(methodCalls).filter(method => {
    return !content.includes(` ${method}(`) && !content.includes(` ${method} =`);
  });
  
  if (missing.length > 0) {
    console.log(`${file}: missing ${missing.join(', ')}`);
  }
});
