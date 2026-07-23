const fs = require('fs');
const pathFile = "c:/Users/ayush/Documents/Dhanlabh V2/electron/main/VisionManager.ts";
let m = fs.readFileSync(pathFile, 'utf-8');

// I need to find `private _lastTrendData: TrendData | null = null; // Cache for the last valid trend data`
// and insert the constructor and method signature right after it.

m = m.replace(/private _lastTrendData: TrendData \| null = null; \/\/ Cache for the last valid trend data\r?\n\r?\n    }\r?\n\r?\n    this\.isProcessing = true;/g, `private _lastTrendData: TrendData | null = null; // Cache for the last valid trend data

  constructor(
    private screenCaptureService: ScreenCaptureService,
    private ocrService: OcrService
  ) {}

  public async onWindowStateUpdate(state: WindowState): Promise<VisionResult | null> {
    if (!state.isFound || !state.position || !state.size) {
      return null;
    }

    const now = Date.now();
    if (this.isProcessing || now - this.lastCaptureTime < config.vision.captureIntervalMs) {
      return null;
    }

    this.isProcessing = true;`);
fs.writeFileSync(pathFile, m);
console.log("Restored VisionManager.ts");
