import { WindowState } from '../../../../shared/types/window';
import { LoggerService } from './LoggerService';
import { OcrService } from './OcrService';
import { ScreenCaptureService } from './ScreenCaptureService';
import { config } from '../config';

export class VisionManager {
  private captureInterval: NodeJS.Timeout | null = null;

  constructor(
    private screenCaptureService: ScreenCaptureService,
    private ocrService: OcrService
  ) {
    LoggerService.info('VisionManager initialized.');
  }

  public onWindowStateUpdate(state: WindowState): void {
    if (state.isFound && state.position && state.size) {
      if (!this.captureInterval) {
        this.startCaptureLoop(state);
      }
    } else {
      this.stopCaptureLoop();
    }
  }

  private startCaptureLoop(state: WindowState): void {
    LoggerService.info('Olymp Trade window found. Starting vision capture loop.');
    this.captureInterval = setInterval(async () => {
      if (!state.position || !state.size) return;
      const image = await this.screenCaptureService.captureWindow(state.position, state.size);
      const text = await this.ocrService.recognizeText(image);
      LoggerService.info('OCR Result:', text.substring(0, 100) + '...');
    }, config.vision.captureIntervalMs);
  }

  private stopCaptureLoop(): void {
    if (this.captureInterval) {
      LoggerService.info('Olymp Trade window lost. Stopping vision capture loop.');
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
  }
}