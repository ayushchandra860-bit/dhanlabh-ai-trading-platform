const fs = require('fs');
const path = require('path');
const { app } = require('electron');

app.whenReady().then(async () => {
  console.log("Electron ready. Running test pipeline...");
  
  // Register ts-node to run TypeScript files directly in electron
  require('ts-node').register({
    project: path.join(__dirname, 'tsconfig.node.json'),
    transpileOnly: true
  });
  
  const { VisionManager } = require('./electron/main/VisionManager');
  const { WindowState } = require('./shared/types/window');
  
  // Mock ScreenCaptureService inside VisionManager
  const vm = new VisionManager();
  
  const testImagePath = 'C:/Users/ayush/.gemini/antigravity/brain/98616994-7081-4150-8895-d1de40d1ae1f/media__1784394645132.png';
  const testImageBuffer = fs.readFileSync(testImagePath);
  
  vm.screenCaptureService.capture = async () => {
    return {
      frame: testImageBuffer,
      timestamp: Date.now(),
      resolution: { width: 1920, height: 1080 }
    };
  };
  
  const mockWindowState = {
    isFound: true,
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    position: { x: 0, y: 0 },
    size: { width: 1920, height: 1080 },
    brokerName: 'OlympTrade',
    lastUpdated: Date.now()
  };
  
  console.log("Starting analyzeFrame...");
  
  try {
    const result = await vm.analyzeFrame(mockWindowState);
    console.log("Analysis Result:");
    console.log(JSON.stringify(result, null, 2));
  } catch(e) {
    console.error("Error during analysis:", e);
  }
  
  app.quit();
});
