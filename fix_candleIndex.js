const fs = require('fs');
const path = require('path');
const enginesDir = 'c:/Users/ayush/Documents/Dhanlabh V2/electron/main/engines';
const files = ['FvgEngine.ts', 'OrderBlockEngine.ts', 'TrendDetectionEngine.ts'];

const candleIndexMethod = `
  private candleIndex(candle: any, defaultIndex: number): number {
    return candle && typeof candle.index === 'number' ? candle.index : defaultIndex;
  }
`;

files.forEach(file => {
  let content = fs.readFileSync(path.join(enginesDir, file), 'utf-8');
  content = content.replace(/\s*public candleIndex: any = null;/g, '');
  
  const lastBraceIndex = content.lastIndexOf('}');
  if (lastBraceIndex !== -1) {
    content = content.substring(0, lastBraceIndex) + candleIndexMethod + '\n}\n';
  }
  fs.writeFileSync(path.join(enginesDir, file), content);
  console.log('Fixed ' + file);
});
