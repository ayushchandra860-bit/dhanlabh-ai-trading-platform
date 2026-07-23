import re

filepath = r"c:\\Users\\ayush\\Documents\\Dhanlabh V2\\electron\\main\\main.ts"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

refresh_pattern = r"(      // ── Signal Confirmation Gate ────────────────────────────────────────.*?)(?=    setAIState\('RUNNING'\);)"
refresh_match = re.search(refresh_pattern, content, re.DOTALL)

if refresh_match:
    old_body = refresh_match.group(1)
    
    new_body = """      // ── Smart Overlay Refresh Policy ────────────────────────────────────────
      const currentDecisionData = visionResult.aiDecisionData;
      const currentSignal = currentDecisionData?.signal ?? 'WAIT';
      
      let shouldUpdate = false;
      let updateReason = '';
      
      if (!lastConfirmedDecisionData) {
        shouldUpdate = true;
        updateReason = 'Initial payload';
      } else {
        const lastSignal = lastConfirmedDecisionData.signal;
        const lastConfidence = lastConfirmedDecisionData.confidence;
        const lastRisk = lastConfirmedDecisionData.riskLevel;
        
        if (currentSignal !== lastSignal) {
          shouldUpdate = true;
          updateReason = Signal state changed from  to ;
        } else if (Math.abs((currentDecisionData?.confidence ?? 0) - lastConfidence) >= 5) {
          shouldUpdate = true;
          updateReason = Confidence changed significantly;
        } else if (Math.abs((currentDecisionData?.riskLevel ?? 0) - lastRisk) >= 10) {
          shouldUpdate = true;
          updateReason = Risk level changed significantly;
        } else {
          const currentSupportY = visionResult.supportResistanceData?.nearestSupport?.price ?? 0;
          const lastSupportY = lastVisionResult?.supportResistanceData?.nearestSupport?.price ?? 0;
          const currentResY = visionResult.supportResistanceData?.nearestResistance?.price ?? 0;
          const lastResY = lastVisionResult?.supportResistanceData?.nearestResistance?.price ?? 0;
          
          if (currentSupportY !== lastSupportY || currentResY !== lastResY) {
             shouldUpdate = true;
             updateReason = Support or Resistance level changed;
          }
        }
      }

      if (shouldUpdate) {
        lastConfirmedDecisionData = currentDecisionData;
        lastVisionResult = visionResult;
        overlayManager?.sendVisionResult(visionResult);
        appendLog([OVERLAY UPDATE] . Signal: );
        
        if (currentSignal === 'BUY' || currentSignal === 'SELL') {
           try {
             const fs = require('fs');
             const path = require('path');
             const appData = require('electron').app.getPath('userData');
             const historyFile = path.join(appData, 'signals.json');
             let history: any[] = [];
             if (fs.existsSync(historyFile)) {
               history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
             }
             history.unshift({ time: new Date().toISOString(), signal: currentSignal, confidence: currentDecisionData?.confidence, tradeScore: currentDecisionData?.tradeScore, pair: visionResult.marketState?.assetName ?? 'Unknown' });
             if (history.length > 50) history = history.slice(0, 50);
             fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
           } catch (e) {
             console.error('Failed to save signal history', e);
           }
        }
      }
"""
    content = content.replace(old_body, new_body)
    
    # We also need to add lastConfirmedDecisionData and lastVisionResult to the top.
    # Find let lastConfirmedDecision = 'WAIT'; and replace it.
    content = content.replace("let lastConfirmedDecision = 'WAIT';", "let lastConfirmedDecisionData: any = null;\nlet lastVisionResult: any = null;")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Finished rewriting main.ts")
else:
    print("Could not find the refresh gate")
