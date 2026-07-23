const fs = require('fs');

const filepath = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/VisionManager.ts";
let content = fs.readFileSync(filepath, 'utf-8');

// 1. Remove all extracted methods
const methodsToRemove = [
    '_analyzeSupportResistance', '_analyzeTrend', '_analyzeMarketStructure', 
    '_analyzeBosChoch', '_analyzeLiquidityAndSweeps', '_analyzeOrderBlocks', 
    '_analyzeFairValueGaps', '_analyzePriceAction', '_analyzeConfluence', 
    '_analyzeTradeScore', '_makeAIDecision', '_generateAIReasons', 
    '_clampScore', '_average', '_candleIndex', '_bodySize', '_upperWickSize', 
    '_lowerWickSize', '_isBullishTrend', '_isBearishTrend', '_distanceQuality', 
    '_generateReasonId'
];

for (const m of methodsToRemove) {
    const regex = new RegExp(`\\n\\s*private ${m}\\([\\s\\S]*?\\): [^{]+ {`);
    let match;
    while ((match = content.match(regex)) !== null) {
        let startIdx = match.index;
        let braceCount = 0;
        let idx = startIdx + match[0].length - 1; 
        for (; idx < content.length; idx++) {
            if (content[idx] === '{') braceCount++;
            if (content[idx] === '}') braceCount--;
            if (braceCount === 0) break;
        }
        content = content.substring(0, startIdx) + content.substring(idx + 1);
    }
}

// 2. Add imports for engines
const engineImports = `
import { PriceScaleCalibrationService } from './engines/PriceScaleCalibrationService';
import { SupportResistanceEngine } from './engines/SupportResistanceEngine';
import { TrendDetectionEngine } from './engines/TrendDetectionEngine';
import { MarketStructureEngine } from './engines/MarketStructureEngine';
import { BosChochEngine } from './engines/BosChochEngine';
import { LiquidityEngine } from './engines/LiquidityEngine';
import { OrderBlockEngine } from './engines/OrderBlockEngine';
import { FvgEngine } from './engines/FvgEngine';
import { PriceActionEngine } from './engines/PriceActionEngine';
import { ConfluenceEngine } from './engines/ConfluenceEngine';
import { TradeScoringEngine } from './engines/TradeScoringEngine';
import { DecisionEngine } from './engines/DecisionEngine';
import { ReasoningEngine } from './engines/ReasoningEngine';
`;
content = content.replace("import { nativeImage } from 'electron';", "import { nativeImage } from 'electron';" + engineImports);

// 3. Add engine instances to VisionManager class
const engineInstances = `
  private priceScaleService = new PriceScaleCalibrationService();
  private srEngine = new SupportResistanceEngine();
  private trendEngine = new TrendDetectionEngine();
  private msEngine = new MarketStructureEngine();
  private bcEngine = new BosChochEngine();
  private liqEngine = new LiquidityEngine();
  private obEngine = new OrderBlockEngine();
  private fvgEngine = new FvgEngine();
  private paEngine = new PriceActionEngine();
  private confEngine = new ConfluenceEngine();
  private tsEngine = new TradeScoringEngine();
  private decEngine = new DecisionEngine();
  private reasonEngine = new ReasoningEngine();
`;
content = content.replace("private frameCounter = 0;", "private frameCounter = 0;" + engineInstances);

// 4. Update onWindowStateUpdate to use engines
content = content.replace(/this\._analyzeSupportResistance\(marketState, candles\)/g, "this.srEngine.analyzeSupportResistance(marketState, candles, this.priceScaleService)");
content = content.replace(/this\._analyzeTrend/g, "this.trendEngine.analyzeTrend");
content = content.replace(/this\._analyzeMarketStructure/g, "this.msEngine.analyzeMarketStructure");
content = content.replace(/this\._analyzeBosChoch/g, "this.bcEngine.analyzeBosChoch");
content = content.replace(/this\._analyzeLiquidityAndSweeps/g, "this.liqEngine.analyzeLiquidityAndSweeps");
content = content.replace(/this\._analyzeOrderBlocks/g, "this.obEngine.analyzeOrderBlocks");
content = content.replace(/this\._analyzeFairValueGaps/g, "this.fvgEngine.analyzeFairValueGaps");
content = content.replace(/this\._analyzePriceAction/g, "this.paEngine.analyzePriceAction");
content = content.replace(/this\._analyzeConfluence/g, "this.confEngine.analyzeConfluence");
content = content.replace(/this\._analyzeTradeScore/g, "this.tsEngine.analyzeTradeScore");
content = content.replace(/this\._makeAIDecision/g, "this.decEngine.makeAIDecision");
content = content.replace(/this\._generateAIReasons/g, "this.reasonEngine.generateAIReasons");

// 5. Add calibration execution before S&R
const calibrationInjection = `
      // OCR Price Axis Calibration
      if (isEnabled('supportResistance') && marketState) {
         this.priceScaleService.calibrate(ocrResult, state, marketState.timeframe);
      }
      
      // 8. Support & Resistance Foundation
`;
content = content.replace("// 8. Support & Resistance Foundation", calibrationInjection);

fs.writeFileSync(filepath, content);
console.log("VisionManager.ts successfully refactored and decoupled!");
