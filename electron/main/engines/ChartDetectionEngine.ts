import { LoggerService } from '../LoggerService';
import { WindowState } from '../../../shared/types/window';
import { ChartDetectionResult, BoundingBox } from '../vision';
import { PNG } from 'pngjs';

export class ChartDetectionEngine {
  public async detect(windowState: WindowState, frameBuffer: Buffer | null): Promise<ChartDetectionResult | null> {
    if (!windowState.position || !windowState.size || !frameBuffer) {
      LoggerService.warn('ChartDetectionEngine: Cannot calculate layout, window state or frame is missing.');
      return null;
    }

    const { x: windowX, y: windowY } = windowState.position;
    const { width: windowWidth, height: windowHeight } = windowState.size;

    // Yield control to Node.js event loop before synchronous parsing
    await new Promise((resolve) => setImmediate(resolve));

    return new Promise((resolve) => {
      try {
        const png = new PNG({ filterType: 4 });
        png.parse(frameBuffer, (error: Error, data: PNG) => {
          if (error) {
            LoggerService.error('ChartDetectionEngine: Error parsing PNG buffer', error);
            resolve(this.fallbackLayout(windowX, windowY, windowWidth, windowHeight, 40));
            return;
          }

          const width = data.width;
          const height = data.height;

          let chartTop = 0;
          let chartBottom = height;
          let chartLeft = 0;
          let chartRight = width;

          const midX = Math.floor(width / 2);
          for (let y = 0; y < height * 0.3; y++) {
            const idx1 = (width * y + midX) << 2;
            const idx2 = (width * (y + 1) + midX) << 2;
            const diff = Math.abs(data.data[idx1] - data.data[idx2]) + Math.abs(data.data[idx1 + 1] - data.data[idx2 + 1]);
            if (diff > 50) {
              chartTop = y + 1;
              break;
            }
          }

          for (let y = height - 1; y > height * 0.7; y--) {
            const idx1 = (width * y + midX) << 2;
            const idx2 = (width * (y - 1) + midX) << 2;
            const diff = Math.abs(data.data[idx1] - data.data[idx2]) + Math.abs(data.data[idx1 + 1] - data.data[idx2 + 1]);
            if (diff > 50) {
              chartBottom = y - 1;
              break;
            }
          }

          const midY = Math.floor(height / 2);
          for (let x = 0; x < width * 0.3; x++) {
            const idx1 = (width * midY + x) << 2;
            const idx2 = (width * midY + (x + 1)) << 2;
            const diff = Math.abs(data.data[idx1] - data.data[idx2]) + Math.abs(data.data[idx1 + 1] - data.data[idx2 + 1]);
            if (diff > 50) {
              chartLeft = x + 1;
              break;
            }
          }

          for (let x = width - 1; x > width * 0.7; x--) {
            const idx1 = (width * midY + x) << 2;
            const idx2 = (width * midY + (x - 1)) << 2;
            const diff = Math.abs(data.data[idx1] - data.data[idx2]) + Math.abs(data.data[idx1 + 1] - data.data[idx2 + 1]);
            if (diff > 50) {
              chartRight = x - 1;
              break;
            }
          }

          if (chartRight - chartLeft < width * 0.4 || chartBottom - chartTop < height * 0.4) {
            resolve(this.fallbackLayout(windowX, windowY, windowWidth, windowHeight, 60));
            return;
          }

          const chartRegion: BoundingBox = {
            x: windowX + chartLeft,
            y: windowY + chartTop,
            width: chartRight - chartLeft,
            height: chartBottom - chartTop,
          };

          const priceAxis: BoundingBox = {
            x: chartRegion.x + Math.round(chartRegion.width * 0.90),
            y: chartRegion.y,
            width: Math.round(chartRegion.width * 0.10),
            height: chartRegion.height,
          };

          const timeAxis: BoundingBox = {
            x: chartRegion.x,
            y: chartRegion.y + Math.round(chartRegion.height * 0.92),
            width: Math.round(chartRegion.width * 0.90),
            height: Math.round(chartRegion.height * 0.08),
          };

          const candleArea: BoundingBox = {
            x: chartRegion.x,
            y: chartRegion.y,
            width: Math.round(chartRegion.width * 0.90),
            height: Math.round(chartRegion.height * 0.92),
          };

          resolve({
            chartRegion,
            priceAxis,
            timeAxis,
            candleArea,
            indicatorArea: null,
            confidence: 85,
          });
        });
      } catch (err) {
        LoggerService.error('ChartDetectionEngine: Exception parsing frame', err);
        resolve(this.fallbackLayout(windowX, windowY, windowWidth, windowHeight, 40));
      }
    });
  }

  private fallbackLayout(windowX: number, windowY: number, windowWidth: number, windowHeight: number, confidence: number): ChartDetectionResult {
    const chartRegion: BoundingBox = {
      x: windowX,
      y: windowY + Math.round(windowHeight * 0.08),
      width: Math.round(windowWidth * 0.80),
      height: Math.round(windowHeight * 0.87),
    };

    const priceAxis: BoundingBox = {
      x: chartRegion.x + Math.round(chartRegion.width * 0.95),
      y: chartRegion.y,
      width: Math.round(chartRegion.width * 0.05),
      height: chartRegion.height,
    };

    const timeAxis: BoundingBox = {
      x: chartRegion.x,
      y: chartRegion.y + Math.round(chartRegion.height * 0.95),
      width: Math.round(chartRegion.width * 0.95),
      height: Math.round(chartRegion.height * 0.05),
    };

    const candleArea: BoundingBox = {
      x: chartRegion.x,
      y: chartRegion.y,
      width: Math.round(chartRegion.width * 0.95),
      height: Math.round(chartRegion.height * 0.95),
    };

    return {
      chartRegion,
      priceAxis,
      timeAxis,
      candleArea,
      indicatorArea: null,
      confidence,
    };
  }
}
