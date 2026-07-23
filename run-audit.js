const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 320,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'dist-electron', 'preload', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    transparent: true,
    frame: false
  });

  const artifactDir = path.join(process.env.APPDATA, '..', 'Local', 'Google', 'Gemini', 'antigravity', 'brain', '98616994-7081-4150-8895-d1de40d1ae1f');
  // Ensure the appdata dir is right. Let's use the actual absolute path from knowledge.
  const realArtifactDir = 'C:/Users/ayush/.gemini/antigravity/brain/98616994-7081-4150-8895-d1de40d1ae1f';

  // Load the overlay
  // I need to serve the dist/frontend folder or use Vite dev server. 
  // Let's use file:// protocol.
  win.loadFile(path.join(__dirname, 'dist', 'frontend', 'index.html'));

  win.webContents.on('did-finish-load', async () => {
    console.log("Overlay Loaded. Taking screenshots...");
    // Inject mock data to render it
    const mockVisionResult = {
      aiDecisionData: {
        signal: 'BUY',
        confidence: 85,
        tradeScore: 92,
        riskLevel: 30,
        isTradeAllowed: true,
        reasoning: {
          positiveReasons: [{description: 'Strong bullish trend'}],
          negativeReasons: []
        },
        checklist: [{label: 'Support Safe', ok: true}],
        nearestDanger: 'None'
      },
      supportResistanceData: {
        nearestSupport: { displayPrice: '1.2000', strength: 5, displayDistance: '15 pips' },
        nearestResistance: { displayPrice: '1.2100', strength: 8, displayDistance: '85 pips' }
      }
    };

    win.webContents.send('overlay:vision-result', mockVisionResult);
    win.webContents.send('overlay:mode-change', 'normal');

    await new Promise(r => setTimeout(r, 1000));
    
    // Screenshot 1: Full Cockpit
    const image1 = await win.webContents.capturePage();
    fs.writeFileSync(path.join(realArtifactDir, 'screenshot_full.png'), image1.toPNG());
    console.log("Captured Full Cockpit");

    // Stress test (Phase 6)
    console.log("Starting Stress Test (10 updates/sec for 5 seconds)...");
    let renderCount = 0;
    const startMem = process.memoryUsage().heapUsed;
    const start = Date.now();
    for (let i = 0; i < 50; i++) {
       mockVisionResult.aiDecisionData.confidence = 80 + (i % 20);
       win.webContents.send('overlay:vision-result', mockVisionResult);
       renderCount++;
       await new Promise(r => setTimeout(r, 100));
    }
    const endMem = process.memoryUsage().heapUsed;
    const memGrowth = (endMem - startMem) / 1024 / 1024;
    console.log(`Stress Test Complete. Render Count: ${renderCount}, Memory Growth: ${memGrowth.toFixed(2)} MB`);

    app.quit();
  });
});
