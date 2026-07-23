const fs = require('fs');
const pathMain = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/main.ts";
let mContent = fs.readFileSync(pathMain, 'utf-8');

// I'll replace exactly what is there.
mContent = mContent.replace("updateReason = Signal state changed from  to ;", "updateReason = `Signal state changed from ${lastSignal} to ${currentSignal}`;");
mContent = mContent.replace("updateReason = Confidence changed significantly;", "updateReason = `Confidence changed significantly`;");
mContent = mContent.replace("updateReason = Risk level changed significantly;", "updateReason = `Risk level changed significantly`;");
mContent = mContent.replace("updateReason = Support or Resistance level changed;", "updateReason = `Support or Resistance level changed`;");
mContent = mContent.replace("appendLog([OVERLAY UPDATE] . Signal: );", "appendLog(`[OVERLAY UPDATE] ${updateReason}. Signal: ${currentSignal}`);");

// Now wait, did I fix `if (visionResult) {` properly?
// At line 200:
// 199:       }
// 200:     setAIState('RUNNING');
// 201:   } catch (error) {
// Wait, my `fix_brace.js` did:
// `mContent.replace("    setAIState('RUNNING');\n  } catch (error) {", "    }\n    setAIState('RUNNING');\n  } catch (error) {")`
// Let's ensure it is fixed.
if (!mContent.includes("}\n    setAIState('RUNNING');")) {
    mContent = mContent.replace("setAIState('RUNNING');\n  } catch (error) {", "}\n    setAIState('RUNNING');\n  } catch (error) {");
}

fs.writeFileSync(pathMain, mContent);
console.log("Fixed main.ts manually.");
