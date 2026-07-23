const fs = require('fs');
const path = require('path');
const enginesDir = 'c:/Users/ayush/Documents/Dhanlabh V2/electron/main/engines';

const files = fs.readdirSync(enginesDir).filter(f => f.endsWith('.ts'));

const utilMethods = `
  private clampScore(score: number): number {
    if (isNaN(score)) return 0;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private average(arr: number[]): number {
    if (!arr || arr.length === 0) return 0;
    const valid = arr.filter(n => !isNaN(n));
    if (valid.length === 0) return 0;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  }

  private distanceQuality(distance: number, averageCandleSize: number): number {
    if (averageCandleSize <= 0) return 50;
    const ratio = distance / averageCandleSize;
    if (ratio < 1) return 100;
    if (ratio < 3) return 80;
    if (ratio < 5) return 60;
    if (ratio < 10) return 40;
    return 20;
  }

  private bodySize(candle: any): number {
    return Math.abs((candle.open ?? 0) - (candle.close ?? 0));
  }

  private isBullishTrend(trendData: any): boolean {
    return trendData?.currentTrend?.direction === 'bullish';
  }

  private isBearishTrend(trendData: any): boolean {
    return trendData?.currentTrend?.direction === 'bearish';
  }
`;

files.forEach(file => {
  let content = fs.readFileSync(path.join(enginesDir, file), 'utf-8');
  let changed = false;
  
  // Remove dummy properties
  const dummyProps = [
    'clampScore', 'average', 'distanceQuality', 'bodySize', 
    'isBullishTrend', 'isBearishTrend'
  ];
  
  dummyProps.forEach(prop => {
    const regex = new RegExp(`\\s*public ${prop}: any = null;`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, '');
      changed = true;
    }
  });

  // Inject real methods if 'this.clampScore' etc are used
  if (changed) {
     // inject at the end of the class, just before the last closing brace
     const lastBraceIndex = content.lastIndexOf('}');
     if (lastBraceIndex !== -1) {
       content = content.substring(0, lastBraceIndex) + utilMethods + '\n}\n';
     }
     fs.writeFileSync(path.join(enginesDir, file), content);
     console.log('Fixed ' + file);
  }
});
