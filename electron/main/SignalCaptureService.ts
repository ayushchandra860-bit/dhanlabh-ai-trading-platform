import * as path from 'path';
import * as fs from 'fs/promises';
import { TempFileManager } from './TempFileManager';
import { app } from 'electron';
import { VisionResult, AIDecisionData } from './vision';
import { LoggerService } from './LoggerService';
import { StorageService } from './StorageService';

export interface CapturedSignalMetadata {
  id: string;
  timestamp: number;
  decision: string;
  confidence: number;
  tradeScore: number;
  assetName: string;
  imagePath: string;
}

export class SignalCaptureService {
  private capturesDir: string;
  private metadataPath: string;

  constructor() {
    this.capturesDir = path.join(app.getPath('userData'), 'captures');
    this.metadataPath = path.join(app.getPath('userData'), 'temp_mars', 'exports', 'captures.json');
    this._ensureDir();
  }

  private async _ensureDir() {
    try {
      await fs.mkdir(this.capturesDir, { recursive: true });
    } catch (error) {
      LoggerService.error('SignalCaptureService: Failed to create captures directory', error);
    }
  }

  public async captureSignal(visionResult: VisionResult, decisionData: AIDecisionData): Promise<CapturedSignalMetadata | null> {
    if (!visionResult.cleanChartImageBuffer) {
      LoggerService.warn('SignalCaptureService: No clean chart image available to capture.');
      return null;
    }

    const id = decisionData.id || `signal-${Date.now()}`;
    const filename = `${id}.png`;
    const imagePath = path.join(this.capturesDir, filename);

    try {
      await TempFileManager.getInstance().createTempFile('signal_capture', filename, visionResult.cleanChartImageBuffer);
      LoggerService.info(`SignalCaptureService: Captured signal image saved to ${imagePath}`);

      const metadata: CapturedSignalMetadata = {
        id,
        timestamp: decisionData.timestamp,
        decision: decisionData.signal,
        confidence: decisionData.confidence,
        tradeScore: decisionData.tradeScore,
        assetName: visionResult.marketState?.assetName || 'UNKNOWN',
        imagePath
      };

      const existing = await this.getCaptures();
      await TempFileManager.getInstance().createTempFile('exports', 'captures.json', JSON.stringify([metadata, ...existing].slice(0, 50), null, 2));
      return metadata;
    } catch (error) {
      LoggerService.error('SignalCaptureService: Failed to save captured signal image', error);
      return null;
    }
  }

  public async getCaptures(): Promise<CapturedSignalMetadata[]> {
    try {
      const raw = await fs.readFile(this.metadataPath, 'utf-8');
      return JSON.parse(raw) as CapturedSignalMetadata[];
    } catch {
      return [];
    }
  }
}
