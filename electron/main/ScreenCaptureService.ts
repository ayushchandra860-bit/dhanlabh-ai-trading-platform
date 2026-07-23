import { desktopCapturer, screen, Rectangle } from 'electron';
import { WindowPosition, WindowSize } from '../../shared/types/window';
import { LoggerService } from './LoggerService';
import { performance } from 'perf_hooks';

export interface ScreenCaptureResult {
  frame: Buffer;
  timestamp: number;
  resolution: { width: number; height: number };
}

export class ScreenCaptureService {
  private static readonly MAX_CAPTURE_ATTEMPTS = 2;

  constructor() {}

  public async capture(position: WindowPosition, size: WindowSize, signal?: AbortSignal): Promise<ScreenCaptureResult | null> {
    if (signal?.aborted) return null;

    if (
      !position ||
      typeof position.x !== 'number' ||
      typeof position.y !== 'number' ||
      !size ||
      typeof size.width !== 'number' ||
      typeof size.height !== 'number' ||
      size.width <= 0 ||
      size.height <= 0
    ) {
      LoggerService.error('ScreenCaptureService: Invalid or missing position/size provided.', { position, size });
      return null;
    }

    for (let attempt = 1; attempt <= ScreenCaptureService.MAX_CAPTURE_ATTEMPTS; attempt++) {
      if (signal?.aborted) return null;

      try {
        const primaryDisplay = screen.getPrimaryDisplay();
        const displayBounds = primaryDisplay.bounds;
        const scaleFactor = primaryDisplay.scaleFactor || 1;

        // Target capture thumbnail resolution
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: {
            width: Math.min(Math.round(size.width), 1280),
            height: Math.min(Math.round(size.height), 720),
          },
        });

        if (signal?.aborted) return null;

        const mainScreenSource = sources.find(source => source.display_id === String(primaryDisplay.id)) || sources[0];

        if (!mainScreenSource) {
          throw new Error('No screen source found.');
        }

        const fullScreenImage = mainScreenSource.thumbnail;
        if (fullScreenImage.isEmpty()) {
          throw new Error('Source thumbnail from desktopCapturer is empty.');
        }

        const thumbnailSize = fullScreenImage.getSize();
        
        // Compute ratio between thumbnail resolution and primary display physical dimensions
        const displayPhysicalWidth = displayBounds.width * scaleFactor;
        const displayPhysicalHeight = displayBounds.height * scaleFactor;

        const scaleX = thumbnailSize.width / Math.max(1, displayPhysicalWidth);
        const scaleY = thumbnailSize.height / Math.max(1, displayPhysicalHeight);

        // Scale window positions and size to thumbnail pixel coordinate space
        let x = Math.round(position.x * scaleX);
        let y = Math.round(position.y * scaleY);
        let width = Math.round(size.width * scaleX);
        let height = Math.round(size.height * scaleY);

        if (x < 0) {
          width += x;
          x = 0;
        }
        if (y < 0) {
          height += y;
          y = 0;
        }
        if (x + width > thumbnailSize.width) width = Math.max(1, thumbnailSize.width - x);
        if (y + height > thumbnailSize.height) height = Math.max(1, thumbnailSize.height - y);

        const cropArea: Rectangle = { x, y, width, height };
        const croppedImage = fullScreenImage.crop(cropArea);

        if (croppedImage.isEmpty()) {
          throw new Error('Cropped image is empty.');
        }

        return {
          frame: croppedImage.toPNG(),
          timestamp: Date.now(),
          resolution: { width, height }
        };
      } catch (error) {
        if (attempt === ScreenCaptureService.MAX_CAPTURE_ATTEMPTS) {
          LoggerService.error('ScreenCaptureService: All capture attempts failed.', error);
          return null;
        }
      }
    }

    return null;
  }
}