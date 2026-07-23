const fs = require('fs');
const path = require('path');

const filepath = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/VisionManager.ts";
let content = fs.readFileSync(filepath, 'utf-8');

const outDir = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/engines";

// Helper to extract a method body
function extractMethod(name) {
    const regex = new RegExp(`private ${name}\\([\\s\\S]*?\\): [^{]+ {`);
    const match = content.match(regex);
    if (!match) return null;
    
    const startIdx = match.index;
    let braceCount = 0;
    let idx = startIdx + match[0].length - 1; // points to {
    let methodContent = "";
    
    for (; idx < content.length; idx++) {
        const char = content[idx];
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        
        if (braceCount === 0) {
            methodContent = content.substring(startIdx, idx + 1);
            break;
        }
    }
    
    // Convert 'private _analyzeX' to 'public analyzeX'
    methodContent = methodContent.replace(`private ${name}`, `public ${name.replace('_', '')}`);
    return methodContent;
}

// Map engine names to their methods
const engines = {
    'SupportResistanceEngine': ['_analyzeSupportResistance'],
    'TrendDetectionEngine': ['_analyzeTrend', '_isBullishTrend', '_isBearishTrend'],
    'MarketStructureEngine': ['_analyzeMarketStructure'],
    'BosChochEngine': ['_analyzeBosChoch'],
    'LiquidityEngine': ['_analyzeLiquidityAndSweeps'],
    'OrderBlockEngine': ['_analyzeOrderBlocks'],
    'FvgEngine': ['_analyzeFairValueGaps'],
    'PriceActionEngine': ['_analyzePriceAction', '_candleIndex', '_bodySize', '_upperWickSize', '_lowerWickSize'],
    'ConfluenceEngine': ['_analyzeConfluence'],
    'TradeScoringEngine': ['_analyzeTradeScore'],
    'ReasoningEngine': ['_generateAIReasons', '_clampScore', '_generateReasonId', '_isBullishTrend', '_isBearishTrend', '_distanceQuality'],
    'DecisionEngine': ['_makeAIDecision', '_clampScore', '_average', '_distanceQuality']
};

const commonImports = `import { LoggerService } from '../LoggerService';
import { config } from '../config';
import { 
  Candle, MarketState, SupportResistanceData, TrendData, 
  MarketStructureData, BosChochData, LiquidityData, OrderBlockData, 
  FvgData, PriceActionData, ConfluenceData, TradeScoreData, 
  AIDecisionData, AIReasoning, TrendDirection, ReasonCategory, ReasonPriority, AIReason, AIDecisionType
} from '../vision';
import { OcrResult } from '../ocr';
`;

for (const [engineName, methods] of Object.entries(engines)) {
    let classContent = `${commonImports}\n\nexport class ${engineName} {\n`;
    
    // Add a cache property if needed by analyzing methods, but we can just let them be pure for now
    // Some methods use `this._last...` which we need to handle.
    // Instead of parsing, we can just replace `this._last` with `this.last` and declare them.
    let props = new Set();
    
    for (const method of methods) {
        let body = extractMethod(method);
        if (!body) continue;
        
        // Find property accesses `this._xyz`
        const propMatches = body.match(/this\._([a-zA-Z0-9_]+)/g);
        if (propMatches) {
            propMatches.forEach(p => {
                const propName = p.replace('this._', '');
                // don't add method names
                if (!methods.includes(`_${propName}`)) {
                    props.add(propName);
                }
                body = body.replace(new RegExp(p.replace('.', '\\.'), 'g'), `this.${propName}`);
            });
        }
        
        classContent += `  ${body}\n\n`;
    }
    
    let propDefs = "";
    props.forEach(p => {
        propDefs += `  public ${p}: any = null;\n`;
    });
    
    classContent = classContent.replace('{\n', `{\n${propDefs}\n`);
    classContent += `}\n`;
    
    fs.writeFileSync(path.join(outDir, `${engineName}.ts`), classContent);
    console.log(`Created ${engineName}.ts`);
}
