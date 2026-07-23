const fs = require('fs');

const pathMain = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/main.ts";
let mContent = fs.readFileSync(pathMain, 'utf-8');

mContent = mContent.replace("    setAIState('RUNNING');\n  } catch (error) {", "    }\n    setAIState('RUNNING');\n  } catch (error) {");

fs.writeFileSync(pathMain, mContent);
console.log("Fixed main brace");
