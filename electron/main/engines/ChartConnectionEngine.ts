import { ChartConnectionData, HealthStatus } from '../vision';
import { LoggerService } from '../LoggerService';
import { performance } from 'perf_hooks';

export class ChartConnectionEngine {
  private lastFrameBuffer: Buffer | null = null;
  private lastFrameTime: number = 0;
  private frameTimestamps: number[] = [];
  
  private consecutiveFrozenFrames: number = 0;
  private disconnectedSince: number = 0;

  // Configuration
  private readonly MAX_LATENCY_MS = 20000;
  private readonly FPS_WINDOW_MS = 2000; // calculate FPS over last 2 seconds
  private readonly MAX_FROZEN_FRAMES = 5; // allow up to 5 identical frames before flagging stale

  public validateConnection(
    currentFrame: Buffer | null, 
    captureTimestamp: number, 
    now: number,
    chartDetected: boolean
  ): ChartConnectionData {
    
    let isFrozen = false;
    let pixelChangeScore = 100; // 100 = full changes, 0 = no changes
    let reason = 'Connected';
    let status: 'CONNECTED' | 'DISCONNECTED' = 'CONNECTED';
    
    const latency = now - captureTimestamp;
    
    // 1. Calculate FPS
    this.frameTimestamps.push(now);
    // Remove old frames outside the window
    this.frameTimestamps = this.frameTimestamps.filter(t => now - t <= this.FPS_WINDOW_MS);
    const fps = Math.round(this.frameTimestamps.length / (this.FPS_WINDOW_MS / 1000));

    // 2. Base Validation
    if (!currentFrame || currentFrame.length === 0) {
      status = 'DISCONNECTED';
      reason = 'No screen updates detected';
      pixelChangeScore = 0;
    } else if (!chartDetected) {
      status = 'DISCONNECTED';
      reason = 'Chart window not detected';
      pixelChangeScore = 0;
    } else if (latency > this.MAX_LATENCY_MS) {
      status = 'DISCONNECTED';
      reason = `Capture latency too high (${latency}ms)`;
      pixelChangeScore = 0;
    } else {
      // 3. Pixel Diffing (Fast Buffer Equality)
      if (this.lastFrameBuffer && this.lastFrameBuffer.length === currentFrame.length) {
        if (this.lastFrameBuffer.equals(currentFrame)) {
          isFrozen = true;
          pixelChangeScore = 0;
        }
      }
      
      // Store copy of buffer to prevent modification issues
      this.lastFrameBuffer = Buffer.from(currentFrame);
      
      if (isFrozen) {
        this.consecutiveFrozenFrames++;
        if (this.consecutiveFrozenFrames >= this.MAX_FROZEN_FRAMES) {
          status = 'DISCONNECTED';
          reason = 'Chart is frozen (No pixel changes)';
        }
      } else {
        this.consecutiveFrozenFrames = 0;
      }
    }

    // 4. Update Disconnect Tracker
    if (status === 'DISCONNECTED') {
      if (this.disconnectedSince === 0) {
        this.disconnectedSince = now;
      }
    } else {
      this.disconnectedSince = 0;
    }

    // Calculate freshness
    let freshnessScore = 100;
    if (status === 'DISCONNECTED') {
      freshnessScore = 0;
    } else if (latency > 500) {
      freshnessScore = Math.max(0, 100 - ((latency - 500) / 10)); // Degradation
    }

    if (status === 'DISCONNECTED') {
      LoggerService.warn(`Chart Connection Engine: ${status} - ${reason}`);
    }

    this.lastFrameTime = captureTimestamp;

    return {
      status,
      fps,
      latencyMs: latency,
      lastFrameTimestamp: captureTimestamp,
      pixelChangeScore,
      freshnessScore,
      reason
    };
  }
}
