const fs = require('fs');
const filepath = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/engines/SupportResistanceEngine.ts";
let content = fs.readFileSync(filepath, 'utf-8');

// Add SupportResistanceLevel to imports
content = content.replace("AIReason, AIDecisionType", "AIReason, AIDecisionType, SupportResistanceLevel");
content = content.replace("import { OcrResult } from '../ocr';", "import { OcrResult } from '../ocr';\nimport { PriceScaleCalibrationService } from './PriceScaleCalibrationService';");

// Add calibration parameter
content = content.replace("candles: Candle[] | null", "candles: Candle[] | null,\n    calibration: PriceScaleCalibrationService");

// In the level assignments:
content = content.replace(/distanceFromCurrentPrice: Math\.abs\((currentCandle\.(?:high|low)) - currentPriceY\),\s*displayPrice: 'Calculating\.\.\.',\s*displayDistance: 'Calculating\.\.\.',/g, 
  (match, p1) => {
      return `distanceFromCurrentPrice: Math.abs(${p1} - currentPriceY),\n          displayPrice: calibration.getPriceForY(${p1})?.toFixed(5) ?? 'Calculating...',\n          displayDistance: calibration.getDistanceForPixels(Math.abs(${p1} - currentPriceY))?.toFixed(0) ?? 'Calculating...',`;
  }
);

content = content.replace(/level\.distanceFromCurrentPrice = Math\.abs\(level\.price - currentPriceY\);\n\s*level\.displayPrice = 'Calculating\.\.\.';\n\s*level\.displayDistance = 'Calculating\.\.\.';/g, 
  `level.distanceFromCurrentPrice = Math.abs(level.price - currentPriceY);
      level.displayPrice = calibration.getPriceForY(level.price)?.toFixed(5) ?? 'Calculating...';
      level.displayDistance = calibration.getDistanceForPixels(level.distanceFromCurrentPrice)?.toFixed(0) ?? 'Calculating...';`
);

fs.writeFileSync(filepath, content);
console.log("Updated SupportResistanceEngine");
